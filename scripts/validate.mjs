#!/usr/bin/env node
// Validates data/models.json, data/changelog.json and data/status.json.
// Usage: node scripts/validate.mjs [--models path] [--changelog path] [--status path]
// Exits 1 and prints every problem if anything is wrong. Nothing deploys or commits unless this passes.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(readFileSync(path.join(ROOT, 'data/schema.json'), 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(schema);
const validators = {
  models: ajv.getSchema(schema.$id),
  changelog: ajv.getSchema(`${schema.$id}#/$defs/changelog`),
  status: ajv.getSchema(`${schema.$id}#/$defs/status`),
};

// Field groups that hold numbers or specs and therefore must be backed by an official source.
const SOURCED_FIELDS = ['pricing', 'context_window', 'max_output_tokens', 'modalities'];
const PRICE_KEYS = ['input', 'output', 'cached_input', 'cache_write', 'batch_input', 'batch_output'];

function schemaErrors(label, validate, data) {
  if (validate(data)) return [];
  // Drop the "or it could be null" alternatives of nullable anyOf fields; the specific error is kept.
  const useful = validate.errors.filter((e) => e.keyword !== 'anyOf' && !(e.keyword === 'type' && e.params?.type === 'null'));
  return useful.map((e) => `${label}${e.instancePath || ''}: ${e.message}${e.params?.allowedValues ? ` (${e.params.allowedValues.join(', ')})` : ''}`);
}

function where(m, i) {
  return `models[${i}] ${m && typeof m.id === 'string' ? m.id : '(no id)'}`;
}

export function validateDataset({ models, changelog = [], status = null }, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const errors = [];
  errors.push(...schemaErrors('models.json', validators.models, models));
  errors.push(...schemaErrors('changelog.json', validators.changelog, changelog));
  if (status !== null) errors.push(...schemaErrors('status.json', validators.status, status));

  const list = Array.isArray(models?.models) ? models.models : [];
  const seen = new Map();

  list.forEach((m, i) => {
    if (!m || typeof m !== 'object') return;
    const at = where(m, i);

    if (seen.has(m.id)) errors.push(`${at}: duplicate id (also models[${seen.get(m.id)}])`);
    else seen.set(m.id, i);

    // Prices: finite, non-negative, and input/output strictly positive unless explicitly free.
    const p = m.pricing;
    if (p && typeof p === 'object') {
      for (const k of PRICE_KEYS) {
        const v = p[k];
        if (v === undefined || v === null) continue;
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) errors.push(`${at}: pricing.${k} must be a non-negative number, got ${JSON.stringify(v)}`);
      }
      if (!p.free) {
        if (typeof p.input === 'number' && p.input <= 0) errors.push(`${at}: pricing.input must be > 0 unless pricing.free is true`);
        if (typeof p.output === 'number' && p.output <= 0) errors.push(`${at}: pricing.output must be > 0 unless pricing.free is true`);
      }
      if (Array.isArray(p.tiers)) {
        let prev = 0;
        for (const [ti, t] of p.tiers.entries()) {
          if (typeof t?.above_input_tokens !== 'number') continue;
          if (t.above_input_tokens <= prev) errors.push(`${at}: pricing.tiers[${ti}].above_input_tokens must increase`);
          if (Number.isInteger(m.context_window) && t.above_input_tokens >= m.context_window) errors.push(`${at}: pricing.tiers[${ti}] starts beyond the context window`);
          prev = t.above_input_tokens;
        }
      }
    }
    // pricing: null means "no official per-token price published"; the page says so instead of showing a number.

    // Context and output sizes.
    if (m.context_window !== undefined && (!Number.isInteger(m.context_window) || m.context_window < 1000 || m.context_window > 100_000_000)) {
      errors.push(`${at}: context_window must be an integer between 1,000 and 100,000,000, got ${JSON.stringify(m.context_window)}`);
    }
    if (Number.isInteger(m.max_output_tokens) && Number.isInteger(m.context_window) && m.max_output_tokens > m.context_window) {
      errors.push(`${at}: max_output_tokens (${m.max_output_tokens}) exceeds context_window (${m.context_window})`);
    }

    // Dates and lifecycle.
    for (const k of ['release_date', 'last_verified']) {
      if (typeof m[k] === 'string' && m[k] > today) errors.push(`${at}: ${k} ${m[k]} is in the future`);
    }
    if (m.status === 'retired') {
      if (!m.retirement_date) errors.push(`${at}: status retired requires retirement_date`);
      else if (m.retirement_date > today) errors.push(`${at}: status retired but retirement_date ${m.retirement_date} is in the future`);
    }
    if (m.status === 'deprecated' && !m.deprecation_date && !m.retirement_date) {
      errors.push(`${at}: status deprecated requires deprecation_date or retirement_date`);
    }
    if (m.open_weights?.available === false && m.open_weights.license) {
      errors.push(`${at}: open_weights.license set but open_weights.available is false`);
    }

    // Every number and spec needs an official source.
    const covered = new Set((Array.isArray(m.sources) ? m.sources : []).flatMap((s) => (Array.isArray(s?.fields) ? s.fields : [])));
    for (const f of SOURCED_FIELDS) {
      if (m[f] === null || m[f] === undefined) continue;
      if (f === 'modalities' && m[f].input === null && m[f].output === null) continue;
      if (!covered.has(f)) errors.push(`${at}: no source covers "${f}"`);
    }
  });

  // Changelog: refers to known models, not dated in the future.
  if (Array.isArray(changelog)) {
    changelog.forEach((c, i) => {
      if (!c || typeof c !== 'object') return;
      if (typeof c.model_id === 'string' && !seen.has(c.model_id)) errors.push(`changelog[${i}]: unknown model_id ${c.model_id}`);
      if (typeof c.date === 'string' && c.date > today) errors.push(`changelog[${i}]: date ${c.date} is in the future`);
    });
  }

  return errors;
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    return { __error: `${path.relative(ROOT, file)}: cannot read or parse (${e.message})` };
  }
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? path.resolve(process.argv[i + 1]) : fallback;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = {
    models: arg('models', path.join(ROOT, 'data/models.json')),
    changelog: arg('changelog', path.join(ROOT, 'data/changelog.json')),
    status: arg('status', path.join(ROOT, 'data/status.json')),
  };
  const data = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, readJson(f)]));
  const parseErrors = Object.values(data).filter((d) => d?.__error).map((d) => d.__error);
  const errors = parseErrors.length ? parseErrors : validateDataset(data);

  if (errors.length) {
    console.error(`✗ Validation failed with ${errors.length} error(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`✓ Valid: ${data.models.models.length} models, ${data.changelog.length} changelog entries`);
}
