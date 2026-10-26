#!/usr/bin/env node
// Prints data/models.json as a plain-text table for quick sanity checks.
// Usage: node scripts/print-table.mjs [provider]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { models } = JSON.parse(readFileSync(path.join(ROOT, 'data/models.json'), 'utf8'));
const only = process.argv[2]?.toLowerCase();

const money = (v) => (v === null || v === undefined ? 'n/a' : `$${v}`);
const tokens = (v) => (v === null || v === undefined ? 'n/a' : v.toLocaleString('en-US'));
const MOD = { text: 'T', image: 'I', audio: 'A', video: 'V', pdf: 'P' };

const cols = [
  ['Model', (m) => m.name],
  ['Status', (m) => (m.status === 'available' ? 'available (status not stated)' : m.status) + (m.retirement_date ? ` →${m.retirement_date.slice(2)}` : '')],
  ['In', (m) => money(m.pricing?.input)],
  ['Out', (m) => money(m.pricing?.output)],
  ['Cached', (m) => money(m.pricing?.cached_input)],
  ['Batch in/out', (m) => (m.pricing?.batch_input != null ? `${money(m.pricing.batch_input)}/${money(m.pricing.batch_output)}` : 'n/a')],
  ['Ctx', (m) => tokens(m.context_window)],
  ['MaxOut', (m) => tokens(m.max_output_tokens)],
  ['In-mod', (m) => (m.modalities.input ? m.modalities.input.map((x) => MOD[x]).join('') : 'n/a')],
  ['Open', (m) => (m.open_weights.available === null ? 'n/a' : m.open_weights.available ? 'yes' : '')],
  ['Notes', (m) => [
    m.pricing === null && 'price: not available',
    m.pricing?.tiers?.length && `tier >${tokens(m.pricing.tiers[0].above_input_tokens)}`,
    m.pricing?.scheduled?.length && `→${money(m.pricing.scheduled[0].input)}/${money(m.pricing.scheduled[0].output)} on ${m.pricing.scheduled[0].effective_date}`,
  ].filter(Boolean).join('; ')],
  ['Released', (m) => m.release_date ?? 'n/a'],
];

const rows = models.filter((m) => !only || m.provider.toLowerCase() === only);
const cells = rows.map((m) => cols.map(([, f]) => String(f(m))));
const widths = cols.map(([h], i) => Math.max(h.length, ...cells.map((r) => r[i].length)));
const line = (r) => r.map((c, i) => (i >= 2 && i <= 7 ? c.padStart(widths[i]) : c.padEnd(widths[i]))).join('  ');

let provider = null;
console.log(line(cols.map(([h]) => h)));
console.log(widths.map((w) => '─'.repeat(w)).join('  '));
rows.forEach((m, i) => {
  if (m.provider !== provider) {
    provider = m.provider;
    console.log(`\n${provider} (${rows.filter((r) => r.provider === provider).length})`);
  }
  console.log(line(cells[i]));
});
console.log(`\n${rows.length} models. Prices: USD per 1M tokens. In-mod: T text, I image, A audio, V video, P pdf. Open: open weights (n/a = not stated by the provider).`);
