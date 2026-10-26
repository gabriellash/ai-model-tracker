// Interactive layer. The page is fully rendered at build time; this adds filtering, sorting, the cost calculator,
// compare mode, URL state, the freshness dot and offline support.
import {
  esc, money, int, parseAmount, modalities, openWeights, sourceLinks, costFor, costText, rowHtml, headHtml,
  SORTS, STATUS, sortModels, groupChangelog, changelogItem, weekItems, weekHtml,
} from './lib.js';

const DATA = JSON.parse(document.getElementById('data').textContent);
const MODELS = DATA.models;
const BY_ID = new Map(MODELS.map((m) => [m.id, m]));
const nameOf = (id) => BY_ID.get(id)?.name ?? id;
const MAX_CMP = 4;
const LOG_PAGE = 25;

const $ = (s, el = document) => el.querySelector(s);
const form = $('#filters');
const calc = $('#calc');
const FILTER_KEYS = ['q', 'provider', 'mod', 'ow', 'status', 'pmin', 'pmax', 'cmin'];
const CALC_KEYS = ['req', 'in', 'out'];

const state = { sort: 'default', dir: 1, cmp: [], logPage: 0 };

// ---- URL state ----

function readUrl() {
  const p = new URLSearchParams(location.search);
  for (const k of FILTER_KEYS) if (form.elements[k]) form.elements[k].value = p.get(k) ?? '';
  for (const k of CALC_KEYS) calc.querySelector(`[name="${k}"]`).value = p.get(k) ?? '';
  if (CALC_KEYS.some((k) => p.get(k))) calc.open = true;
  state.sort = SORTS[p.get('sort')] ? p.get('sort') : 'default';
  state.dir = p.get('dir') === 'd' ? -1 : 1;
  state.cmp = (p.get('cmp') ?? '').split(',').filter((id) => BY_ID.has(id)).slice(0, MAX_CMP);
}

function writeUrl() {
  const p = new URLSearchParams();
  for (const k of FILTER_KEYS) if (form.elements[k].value) p.set(k, form.elements[k].value);
  for (const k of CALC_KEYS) { const v = calc.querySelector(`[name="${k}"]`).value.trim(); if (v) p.set(k, v); }
  if (state.sort !== 'default') p.set('sort', state.sort);
  if (state.dir === -1) p.set('dir', 'd');
  if (state.cmp.length) p.set('cmp', state.cmp.join(','));
  const qs = p.toString().replace(/%2C/g, ',');
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

// ---- Table ----

function calcInput() {
  const get = (k) => parseAmount(calc.querySelector(`[name="${k}"]`).value);
  const v = { req: get('req'), inTok: get('in'), outTok: get('out') };
  const bad = Object.values(v).some((x) => Number.isNaN(x));
  const any = Object.values(v).some((x) => x !== null);
  calc.classList.toggle('invalid', bad);
  if (bad || !any) return null;
  return { req: v.req ?? 1, inTok: v.inTok ?? 0, outTok: v.outTok ?? 0 };
}

function filtered() {
  const f = Object.fromEntries(FILTER_KEYS.map((k) => [k, form.elements[k].value.trim()]));
  const q = f.q.toLowerCase();
  const pmin = f.pmin === '' ? null : Number(f.pmin);
  const pmax = f.pmax === '' ? null : Number(f.pmax);
  const cmin = f.cmin === '' ? null : Number(f.cmin);
  return MODELS.filter((m) => {
    if (q && !`${m.name} ${m.provider} ${m.api_id ?? ''} ${m.id}`.toLowerCase().includes(q)) return false;
    if (f.provider && m.provider !== f.provider) return false;
    if (f.mod && !(m.modalities.input ?? []).includes(f.mod)) return false;
    if (f.ow === 'yes' && m.open_weights.available !== true) return false;
    if (f.ow === 'no' && m.open_weights.available !== false) return false;
    if (f.ow === 'na' && m.open_weights.available !== null) return false;
    if (f.status === 'available' && !['available', 'ga'].includes(m.status)) return false;
    if (f.status && f.status !== 'available' && m.status !== f.status) return false;
    if ((pmin !== null || pmax !== null) && typeof m.pricing?.input !== 'number') return false;
    if (pmin !== null && m.pricing.input < pmin) return false;
    if (pmax !== null && m.pricing.input > pmax) return false;
    if (cmin !== null && m.context_window < cmin) return false;
    return true;
  });
}

function renderTable() {
  const c = calcInput();
  const showCost = c !== null;
  if (!showCost && state.sort === 'cost') state.sort = 'default';
  let list = filtered();
  const costs = new Map(showCost ? list.map((m) => [m.id, costFor(m, c)]) : []);
  if (state.sort === 'cost' || (showCost && state.sort === 'default')) {
    list = sortModels(list, (m) => costs.get(m.id)?.total ?? null, state.sort === 'cost' ? state.dir : 1);
  } else if (SORTS[state.sort].key) {
    list = sortModels(list, SORTS[state.sort].key, state.dir);
  }
  const effectiveSort = showCost && state.sort === 'default' ? 'cost' : state.sort;
  $('#table thead tr').innerHTML = headHtml({ showCost, sort: effectiveSort, dir: state.dir });
  const full = state.cmp.length >= MAX_CMP;
  $('#rows').innerHTML = list.map((m) => rowHtml(m, {
    showCost, cost: costs.get(m.id), selected: state.cmp.includes(m.id), disabled: full,
  })).join('');
  $('#empty').hidden = list.length > 0;
  $('#count').textContent = `${list.length} of ${MODELS.length}`;
  const sortSel = form.elements.sort;
  sortSel.querySelector('option[value="cost"]').disabled = !showCost;
  sortSel.value = effectiveSort;
  renderTray();
  writeUrl();
}

// ---- Compare ----

function renderTray() {
  const n = state.cmp.length;
  $('#tray').hidden = n === 0;
  $('#tray-text').textContent = n < 2 ? `${n} selected. Pick 2 to ${MAX_CMP} models to compare.` : `${n} models selected${n === MAX_CMP ? ' (maximum)' : ''}.`;
  $('#cmp-open').disabled = n < 2;
}

const CMP_ROWS = [
  ['Provider', (m) => esc(m.provider)],
  ['API id', (m) => (m.api_id ? `<code>${esc(m.api_id)}</code>` : 'n/a')],
  ['Status', (m) => STATUS[m.status] + (m.retirement_date ? ` (retires ${m.retirement_date})` : '')],
  ...[['Input $/1M', 'input'], ['Output $/1M', 'output'], ['Cached input $/1M', 'cached_input'], ['Cache write $/1M', 'cache_write'], ['Batch input $/1M', 'batch_input'], ['Batch output $/1M', 'batch_output']]
    .map(([label, k]) => [label, (m) => (m.pricing ? money(m.pricing[k]) ?? 'n/a' : 'Not available')]),
  ['Long-context tiers', (m) => (m.pricing?.tiers ?? []).map((t) => `&gt;${int(t.above_input_tokens)} input: ${money(t.input) ?? 'n/a'} / ${money(t.output) ?? 'n/a'}`).join('<br>') || 'None listed'],
  ['Announced price changes', (m) => (m.pricing?.scheduled ?? []).map((s) => `from ${s.effective_date}: ${money(s.input) ?? 'n/a'} / ${money(s.output) ?? 'n/a'}`).join('<br>') || 'None listed'],
  ['Context window', (m) => int(m.context_window)],
  ['Max output', (m) => int(m.max_output_tokens) ?? 'n/a'],
  ['Input → output', (m) => esc(modalities(m))],
  ['Open weights', (m) => esc(openWeights(m))],
  ['Availability', (m) => esc(m.availability.join(', '))],
  ['Released', (m) => m.release_date ?? 'n/a'],
  ['Verified', (m) => m.last_verified],
  ['Sources', (m) => sourceLinks(m)],
];

function openCompare() {
  const ms = state.cmp.map((id) => BY_ID.get(id));
  const head = `<thead><tr><th scope="col"><span class="vh">Field</span></th>${ms.map((m) => `<th scope="col">${esc(m.name)}</th>`).join('')}</tr></thead>`;
  const body = CMP_ROWS.map(([label, f]) => {
    const vals = ms.map(f);
    const differs = label !== 'Sources' && new Set(vals).size > 1;
    return `<tr${differs ? ' class="diff"' : ''}><th scope="row">${label}${differs ? '<span class="vh"> (differs)</span>' : ''}</th>${vals.map((v) => `<td>${v}</td>`).join('')}</tr>`;
  }).join('');
  $('#cmp-table').innerHTML = head + `<tbody>${body}</tbody>`;
  $('#cmp').showModal();
}

// ---- Changelog ----

function renderLog(initial = false) {
  const prov = $('#log-provider').value;
  const groups = groupChangelog(DATA.changelog.filter((c) => !prov || c.provider === prov));
  const pages = Math.max(1, Math.ceil(groups.length / LOG_PAGE));
  state.logPage = Math.min(state.logPage, pages - 1);
  const slice = groups.slice(state.logPage * LOG_PAGE, (state.logPage + 1) * LOG_PAGE);
  if (!initial) $('#log').innerHTML = slice.length ? slice.map((c) => changelogItem(c, nameOf)).join('') : '<li class="muted">No entries.</li>';
  $('#log-page').textContent = `Page ${state.logPage + 1} of ${pages}`;
  $('#log-prev').disabled = state.logPage === 0;
  $('#log-next').disabled = state.logPage >= pages - 1;
}

// ---- Header: freshness, theme, offline ----

const dateFmt = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });

function renderFreshness(status) {
  const checked = new Date(status.last_checked);
  const hours = (Date.now() - checked.getTime()) / 36e5;
  const level = hours < 36 ? 'green' : hours < 72 ? 'amber' : 'red';
  const ago = hours < 1 ? 'less than 1 hour ago' : hours < 48 ? `${Math.floor(hours)} h ago` : `${Math.floor(hours / 24)} days ago`;
  const note = level === 'green' ? '' : level === 'amber' ? '. Daily check is late.' : '. Data may be out of date.';
  const el = $('#freshness');
  el.className = `fresh fresh-${level}`;
  $('#fresh-text').innerHTML = `Last checked <time datetime="${esc(status.last_checked)}">${esc(dateFmt.format(checked))}</time> (${ago})${note}`;
  el.title = 'Green: checked within 36 hours. Amber: within 72 hours. Red: older.';
  const changed = $('#changed');
  changed.dateTime = status.last_changed;
  changed.textContent = dateFmt.format(new Date(status.last_changed));
  return checked;
}

async function refreshStatus() {
  const checked = renderFreshness(DATA.status);
  try {
    const res = await fetch('status.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    const live = await res.json();
    if (live.last_checked !== DATA.status.last_checked) renderFreshness(live);
    $('#offline').hidden = true;
  } catch {
    const b = $('#offline');
    b.textContent = `You are offline. Showing data saved on this device, last checked ${dateFmt.format(checked)}.`;
    b.hidden = false;
  }
}

const THEMES = ['system', 'light', 'dark'];
function applyTheme(t) {
  if (t === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  const b = $('#theme');
  b.textContent = `Theme: ${t}`;
  b.setAttribute('aria-label', `Colour theme: ${t}. Activate to change.`);
}
function currentTheme() {
  try { return THEMES.includes(localStorage.getItem('theme')) ? localStorage.getItem('theme') : 'system'; } catch { return 'system'; }
}

// ---- Wiring ----

let debounce;
form.addEventListener('input', (e) => {
  if (e.target.name === 'sort') return;
  clearTimeout(debounce);
  debounce = setTimeout(renderTable, e.target.type === 'search' ? 120 : 0);
});
form.elements.sort.addEventListener('change', (e) => {
  state.sort = e.target.value;
  state.dir = ['context', 'maxout', 'released'].includes(state.sort) ? -1 : 1;
  renderTable();
});
calc.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(renderTable, 150); });
$('#clear-filters').addEventListener('click', () => {
  form.reset();
  calc.querySelectorAll('input').forEach((i) => { i.value = ''; });
  state.sort = 'default'; state.dir = 1;
  renderTable();
});

$('#table').addEventListener('click', (e) => {
  const btn = e.target.closest('button.sort');
  if (!btn) return;
  const key = btn.dataset.sort;
  state.dir = state.sort === key || (key === 'cost' && state.sort === 'default') ? -state.dir : 1;
  state.sort = key;
  renderTable();
  $(`#table button.sort[data-sort="${key}"]`)?.focus();
});
$('#rows').addEventListener('change', (e) => {
  if (!e.target.classList.contains('cmp')) return;
  const id = e.target.value;
  state.cmp = e.target.checked ? [...new Set([...state.cmp, id])].slice(0, MAX_CMP) : state.cmp.filter((x) => x !== id);
  const full = state.cmp.length >= MAX_CMP;
  document.querySelectorAll('#rows input.cmp').forEach((cb) => { cb.disabled = full && !cb.checked; });
  renderTray();
  writeUrl();
});
$('#cmp-open').addEventListener('click', openCompare);
$('#cmp-close').addEventListener('click', () => $('#cmp').close());
$('#cmp-clear').addEventListener('click', () => { state.cmp = []; renderTable(); });

$('#log-provider').addEventListener('change', () => { state.logPage = 0; renderLog(); });
$('#log-prev').addEventListener('click', () => { state.logPage--; renderLog(); });
$('#log-next').addEventListener('click', () => { state.logPage++; renderLog(); });

$('#theme').addEventListener('click', () => {
  const next = THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length];
  try { if (next === 'system') localStorage.removeItem('theme'); else localStorage.setItem('theme', next); } catch { /* storage blocked: theme lasts for this page only */ }
  applyTheme(next);
});

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) {
    e.preventDefault();
    form.elements.q.focus();
  }
});
window.addEventListener('online', refreshStatus);
window.addEventListener('offline', refreshStatus);

// The build already rendered the default view, so the table is only re-rendered when the URL asks for
// something else. This keeps the main thread free on load.
readUrl();
applyTheme(currentTheme());
const week = weekHtml(weekItems(MODELS, DATA.changelog, new Date().toISOString().slice(0, 10)));
if ($('#week').innerHTML !== week) $('#week').innerHTML = week;
if (location.search) renderTable();
renderLog(true);
refreshStatus();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
