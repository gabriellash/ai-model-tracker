#!/usr/bin/env node
// Suspicious-change guard. Compares data/ in the working tree with a git base (default HEAD).
//
//   clean   → safe to commit straight to main
//   flagged → open a pull request for human review (big price/context moves, many changes, new provider)
//   fail    → refuse entirely (model removed, changelog rewritten, undocumented change, files outside data/)
//
// Usage: node scripts/guard.mjs [--base HEAD]
// Writes guard-result.json and guard-report.md; sets GitHub Actions outputs when available. Exits 1 on fail.

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const LIMITS = { priceMove: 0.5, contextFactor: 4, maxChangedModels: 10 };
export const ALLOWED_FILES = ['data/models.json', 'data/changelog.json'];

// Fields excluded from change detection: bookkeeping that the agent updates on every successful check.
const BOOKKEEPING = new Set(['last_verified', 'sources']);

function fieldMap(m) {
  const out = {};
  for (const [k, v] of Object.entries(m)) {
    if (BOOKKEEPING.has(k)) continue;
    if (k === 'pricing' && v && typeof v === 'object') {
      for (const [pk, pv] of Object.entries(v)) out[`pricing.${pk}`] = pv;
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function diffModels(oldModels, newModels) {
  const before = new Map(oldModels.map((m) => [m.id, m]));
  const after = new Map(newModels.map((m) => [m.id, m]));
  const changes = [];
  const removed = [...before.keys()].filter((id) => !after.has(id));

  for (const [id, m] of after) {
    const o = before.get(id);
    if (!o) {
      changes.push({ model_id: id, provider: m.provider, field: '*', old: null, new: m, kind: 'added' });
      continue;
    }
    // Pricing switching between null and an object is one change on "pricing".
    if ((o.pricing === null) !== (m.pricing === null)) {
      changes.push({ model_id: id, provider: m.provider, field: 'pricing', old: o.pricing, new: m.pricing, kind: 'changed' });
    }
    const a = fieldMap(o);
    const b = fieldMap(m);
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (k === 'pricing') continue;
      if (k.startsWith('pricing.') && (o.pricing === null || m.pricing === null)) continue;
      const ov = a[k] === undefined ? null : a[k];
      const nv = b[k] === undefined ? null : b[k];
      if (!isDeepStrictEqual(ov, nv)) changes.push({ model_id: id, provider: m.provider, field: k, old: ov, new: nv, kind: 'changed' });
    }
  }
  return { changes, removed };
}

function changelogCovers(entries, change) {
  return entries.some((e) => {
    if (e.model_id !== change.model_id || typeof e.source !== 'string' || !e.source.startsWith('https://')) return false;
    if (change.field === '*') return e.field === '*';
    if (e.field === change.field) return isDeepStrictEqual(e.new ?? null, change.new ?? null);
    // A parent entry (e.g. "pricing.tiers" or "modalities") covers the nested change when its value matches.
    return change.field.startsWith(`${e.field}.`);
  });
}

export function guard({ oldModels, newModels, oldChangelog, newChangelog, changedFiles = [], today = new Date().toISOString().slice(0, 10) }) {
  const failures = [];
  const flags = [];
  const notes = [];
  const oldById = new Map(oldModels.map((m) => [m.id, m]));

  const strayFiles = changedFiles.filter((f) => !ALLOWED_FILES.includes(f));
  if (strayFiles.length) failures.push(`Files changed outside the data files: ${strayFiles.join(', ')}`);

  const { changes, removed } = diffModels(oldModels, newModels);
  for (const id of removed) failures.push(`Model removed: ${id}. Models are never deleted; mark them retired instead.`);

  if (newChangelog.length < oldChangelog.length || !isDeepStrictEqual(newChangelog.slice(0, oldChangelog.length), oldChangelog)) {
    failures.push('changelog.json was edited, not appended to. Existing entries must never change.');
  }
  const appended = newChangelog.slice(oldChangelog.length);

  for (const c of changes) {
    if (!changelogCovers(appended, c)) failures.push(`Undocumented change: ${c.model_id} ${c.field} (${fmt(c.old)} → ${fmt(c.field === '*' ? 'new model' : c.new)}) has no matching changelog entry with a source URL`);
  }

  // Suspicious but legitimate-looking moves: a human approves these.
  for (const c of changes) {
    if (c.field.startsWith('pricing.') && typeof c.old === 'number' && typeof c.new === 'number') {
      const move = c.old === 0 ? (c.new === 0 ? 0 : Infinity) : Math.abs(c.new - c.old) / c.old;
      // A price that matches an already-announced change whose date has arrived is expected, not suspicious.
      const key = c.field.slice('pricing.'.length);
      const announced = (oldById.get(c.model_id)?.pricing?.scheduled ?? []).find((s) => s.effective_date <= today && s[key] === c.new);
      if (move > LIMITS.priceMove && announced) notes.push(`Price moved ${Math.round(move * 100)}% as announced for ${announced.effective_date}: ${c.model_id} ${c.field} ${fmt(c.old)} → ${fmt(c.new)}`);
      else if (move > LIMITS.priceMove) flags.push(`Price moved ${move === Infinity ? 'from 0' : `${Math.round(move * 100)}%`}: ${c.model_id} ${c.field} ${fmt(c.old)} → ${fmt(c.new)}`);
    }
    if (c.field === 'context_window' && typeof c.old === 'number' && typeof c.new === 'number') {
      const factor = Math.max(c.new / c.old, c.old / c.new);
      if (factor > LIMITS.contextFactor) flags.push(`Context window changed ${factor.toFixed(1)}×: ${c.model_id} ${fmt(c.old)} → ${fmt(c.new)}`);
    }
  }
  const changedModels = new Set(changes.map((c) => c.model_id));
  if (changedModels.size > LIMITS.maxChangedModels) flags.push(`${changedModels.size} entries changed in one run (limit ${LIMITS.maxChangedModels})`);

  const oldProviders = new Set(oldModels.map((m) => m.provider));
  for (const p of new Set(newModels.map((m) => m.provider))) {
    if (!oldProviders.has(p)) flags.push(`New provider: ${p}`);
  }

  const status = failures.length ? 'fail' : flags.length ? 'flagged' : 'clean';
  return { status, failures, flags, notes, changes, appended, changedModels: changedModels.size };
}

function fmt(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return v.toLocaleString('en-US');
  return typeof v === 'string' ? v : JSON.stringify(v);
}

export function renderReport(result) {
  const lines = [`## Guard result: **${result.status}**`, ''];
  if (result.failures.length) lines.push('### Blocking problems', ...result.failures.map((f) => `- ${f}`), '');
  if (result.flags.length) lines.push('### Needs human review', ...result.flags.map((f) => `- ${f}`), '');
  if (result.notes?.length) lines.push('### Large but announced (not flagged)', ...result.notes.map((f) => `- ${f}`), '');
  if (!result.appended.length) {
    lines.push('No data changes.');
  } else {
    lines.push(`### ${result.appended.length} change(s)`, '', '| Model | Field | Old | New | Source |', '|---|---|---|---|---|');
    for (const e of result.appended) {
      const nv = e.field === '*' ? 'new model' : fmt(e.new);
      lines.push(`| ${e.model_id} | ${e.field} | ${fmt(e.old)} | ${nv} | [source](${e.source}) |`);
    }
  }
  return lines.join('\n') + '\n';
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const bi = process.argv.indexOf('--base');
  const base = bi > -1 ? process.argv[bi + 1] : 'HEAD';
  const read = (f) => JSON.parse(readFileSync(path.join(ROOT, f), 'utf8'));
  const readBase = (f) => JSON.parse(git(['show', `${base}:${f}`]));

  const changedFiles = [
    ...git(['diff', '--name-only', base]).split('\n'),
    ...git(['ls-files', '--others', '--exclude-standard']).split('\n'),
  ].map((s) => s.trim()).filter(Boolean);

  const result = guard({
    oldModels: readBase('data/models.json').models,
    newModels: read('data/models.json').models,
    oldChangelog: readBase('data/changelog.json'),
    newChangelog: read('data/changelog.json'),
    changedFiles: [...new Set(changedFiles)],
  });
  const report = renderReport(result);

  writeFileSync(path.join(ROOT, 'guard-report.md'), report);
  writeFileSync(path.join(ROOT, 'guard-result.json'), JSON.stringify({ status: result.status, changes: result.appended.length, changed_models: result.changedModels, failures: result.failures, flags: result.flags }, null, 2));
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `result=${result.status}\nchanges=${result.appended.length}\n`);

  console.log(report);
  if (result.status === 'fail') process.exit(1);
}
