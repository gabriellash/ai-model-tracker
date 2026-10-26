import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { validateDataset } from '../scripts/validate.mjs';

const load = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8'));
const TODAY = '2026-10-26';

test('valid fixture passes', () => {
  assert.deepEqual(validateDataset({ models: load('valid-models.json'), changelog: [] }, { today: TODAY }), []);
});

test('broken fixture is rejected with every expected error', () => {
  const errors = validateDataset({ models: load('broken-models.json'), changelog: [] }, { today: TODAY });
  const expect = [
    [/duplicate id/, 'duplicate id'],
    [/pricing\.input must be a non-negative number/, 'negative price'],
    [/no-source: no source covers "pricing"/, 'price without a source'],
    [/string-context: context_window must be an integer/, 'context window as a string'],
    [/retired requires retirement_date/, 'retired without a date'],
    [/context_window must be an integer between/, 'implausible context window'],
    [/sources\/0\/url: must match pattern/, 'non-https source'],
    [/last_verified 2030-01-01 is in the future/, 'future verification date'],
  ];
  for (const [re, what] of expect) {
    assert.ok(errors.some((e) => re.test(e)), `expected an error for ${what}\n${errors.join('\n')}`);
  }
});

test('CLI exits non-zero on the broken fixture', () => {
  assert.throws(
    () => execFileSync('node', ['scripts/validate.mjs', '--models', 'tests/fixtures/broken-models.json', '--changelog', 'tests/fixtures/empty-changelog.json', '--status', 'tests/fixtures/status.json'], { stdio: 'pipe' }),
    (err) => err.status === 1 && /Validation failed/.test(err.stderr.toString()),
  );
});

test('free models may have zero prices, paid ones may not', () => {
  const models = load('valid-models.json');
  models.models[0].pricing.input = 0;
  assert.ok(validateDataset({ models }, { today: TODAY }).some((e) => /pricing.input must be > 0/.test(e)));
  models.models[0].pricing.free = true;
  models.models[0].pricing.output = 0;
  assert.deepEqual(validateDataset({ models }, { today: TODAY }), []);
});

test('changelog entries must reference known models and have https sources', () => {
  const changelog = [{ date: TODAY, model_id: 'example/missing', provider: 'Example', type: 'price', field: 'pricing.input', old: 1, new: 2, source: 'http://x.com' }];
  const errors = validateDataset({ models: load('valid-models.json'), changelog }, { today: TODAY });
  assert.ok(errors.some((e) => /unknown model_id/.test(e)));
  assert.ok(errors.some((e) => /changelog\.json\/0\/source/.test(e)));
});
