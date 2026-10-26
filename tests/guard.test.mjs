import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { guard } from '../scripts/guard.mjs';

const base = () => JSON.parse(readFileSync(new URL('./fixtures/valid-models.json', import.meta.url), 'utf8')).models;
const SRC = 'https://example.com/pricing';
const entry = (model_id, field, old, nv, type = 'price') => ({ date: '2026-10-26', model_id, provider: 'Example', type, field, old, new: nv, source: SRC });
const run = (newModels, appended = [], changedFiles = ['data/models.json', 'data/changelog.json']) =>
  guard({ oldModels: base(), newModels, oldChangelog: [], newChangelog: appended, changedFiles });

test('no changes is clean', () => {
  const r = run(base(), [], []);
  assert.equal(r.status, 'clean');
  assert.equal(r.appended.length, 0);
});

test('documented small price change is clean', () => {
  const m = base();
  m[0].pricing.input = 2.5;
  assert.equal(run(m, [entry('example/alpha-1', 'pricing.input', 2, 2.5)]).status, 'clean');
});

test('bumping only last_verified needs no changelog', () => {
  const m = base();
  m[0].last_verified = '2026-10-27';
  assert.equal(run(m).status, 'clean');
});

test('price move above 50% is flagged for review', () => {
  const m = base();
  m[0].pricing.output = 16;
  const r = run(m, [entry('example/alpha-1', 'pricing.output', 8, 16)]);
  assert.equal(r.status, 'flagged');
  assert.match(r.flags[0], /Price moved 100%/);
});

test('context window change above 4x is flagged', () => {
  const m = base();
  m[1].context_window = 8000;
  const r = run(m, [entry('example/beta-open', 'context_window', 128000, 8000, 'spec')]);
  assert.equal(r.status, 'flagged');
  assert.match(r.flags[0], /Context window changed 16\.0×/);
});

test('more than 10 changed entries is flagged', () => {
  const m = base();
  const added = [];
  for (let i = 0; i < 11; i++) {
    m.push({ ...structuredClone(m[0]), id: `example/new-${i}` });
    added.push(entry(`example/new-${i}`, '*', null, null, 'launch'));
  }
  const r = run(m, added);
  assert.equal(r.status, 'flagged');
  assert.ok(r.flags.some((f) => /11 entries changed/.test(f)));
});

test('new provider is flagged', () => {
  const m = base();
  m.push({ ...structuredClone(m[0]), id: 'newco/x', provider: 'NewCo' });
  const r = run(m, [{ ...entry('newco/x', '*', null, null, 'launch'), provider: 'NewCo' }]);
  assert.equal(r.status, 'flagged');
  assert.ok(r.flags.some((f) => /New provider: NewCo/.test(f)));
});

test('removing a model fails', () => {
  const r = run(base().slice(0, 1));
  assert.equal(r.status, 'fail');
  assert.match(r.failures[0], /Model removed: example\/beta-open/);
});

test('undocumented change fails', () => {
  const m = base();
  m[0].pricing.input = 2.1;
  const r = run(m);
  assert.equal(r.status, 'fail');
  assert.match(r.failures[0], /Undocumented change: example\/alpha-1 pricing.input/);
});

test('changelog entry with the wrong value does not count', () => {
  const m = base();
  m[0].pricing.input = 2.1;
  assert.equal(run(m, [entry('example/alpha-1', 'pricing.input', 2, 2.2)]).status, 'fail');
});

test('rewriting old changelog entries fails', () => {
  const old = [entry('example/alpha-1', 'pricing.input', 1, 2)];
  const r = guard({ oldModels: base(), newModels: base(), oldChangelog: old, newChangelog: [{ ...old[0], old: 1.5 }], changedFiles: [] });
  assert.equal(r.status, 'fail');
  assert.match(r.failures[0], /edited, not appended/);
});

test('files outside the data files fail', () => {
  const r = run(base(), [], ['data/models.json', '.github/workflows/deploy.yml']);
  assert.equal(r.status, 'fail');
  assert.match(r.failures[0], /deploy\.yml/);
});
