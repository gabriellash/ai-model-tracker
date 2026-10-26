#!/usr/bin/env node
// One-off: writes the initial data/models.json, data/changelog.json and data/status.json from the seed files.
// Kept in the repo as a record of where every seeded number came from. Re-running overwrites the data files.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { VERIFIED } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const providers = ['anthropic', 'openai', 'google', 'meta', 'mistral', 'xai', 'deepseek', 'cohere', 'amazon', 'alibaba'];

const models = [];
for (const p of providers) models.push(...(await import(`./${p}.mjs`)).default);

const changelog = models.map((m) => ({
  date: VERIFIED, model_id: m.id, provider: m.provider, type: 'seed', field: '*', old: null, new: null,
  source: m.sources[0].url, note: 'Initial research pass',
}));

const write = (f, data) => writeFileSync(path.join(ROOT, f), JSON.stringify(data, null, 2) + '\n');
write('data/models.json', { $schema: './schema.json', schema_version: 1, models });
write('data/changelog.json', changelog);
write('data/status.json', { last_checked: `${VERIFIED}T12:00:00Z`, last_changed: `${VERIFIED}T12:00:00Z`, last_run_url: null });
console.log(`Seeded ${models.length} models from ${providers.length} providers.`);
