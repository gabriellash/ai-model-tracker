// Shared by scripts/build.mjs (static HTML) and src/app.js (browser). Pure functions, no DOM access.
// Every number shown comes straight from data/models.json; missing values render as "n/a", never as an estimate.

export const NA = '<span class="na">n/a</span>';

export const STATUS = {
  preview: 'Preview',
  available: 'Available (status not stated)',
  ga: 'Generally available',
  deprecated: 'Deprecated',
  retired: 'Retired',
};

const SOURCE_LABEL = {
  pricing: 'price', context_window: 'specs', max_output_tokens: 'specs', modalities: 'specs',
  release_date: 'release', status: 'status', open_weights: 'weights', availability: 'availability',
};

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function money(v) {
  if (v === null || v === undefined) return null;
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
}

export function int(v) {
  return v === null || v === undefined ? null : v.toLocaleString('en-US');
}

// Accepts 1500, 1,500, 500k, 10M, 1.5B (k = 1,000).
export function parseAmount(s) {
  const t = String(s ?? '').trim().replace(/[,_\s]/g, '').toLowerCase();
  if (!t) return null;
  const m = t.match(/^(\d+(?:\.\d+)?)([kmb]?)$/);
  if (!m) return NaN;
  return Math.round(Number(m[1]) * { '': 1, k: 1e3, m: 1e6, b: 1e9 }[m[2]]);
}

export function modalities(m) {
  const list = (a) => (a ? a.join(', ') : 'n/a');
  return `${list(m.modalities.input)} → ${list(m.modalities.output)}`;
}

export function openWeights(m) {
  const o = m.open_weights;
  if (o.available === null) return 'Not stated';
  if (!o.available) return 'No';
  return o.license ? `Yes (${o.license})` : 'Yes (license not stated)';
}

// Groups sources by URL and labels each link with the fields it backs.
export function sourceLinks(m) {
  return m.sources
    .map((s) => {
      const labels = [...new Set(s.fields.map((f) => SOURCE_LABEL[f] ?? f))].join(', ');
      return `<a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(labels)}<span class="vh"> source for ${esc(m.name)} (opens in new tab)</span></a>`;
    })
    .join(' ');
}

// Rate for one request with the given input length. The calculator applies the highest tier whose threshold
// the input exceeds to the whole request; the page states this rule next to the calculator.
export function rateFor(p, inputTokens) {
  let rate = { input: p.input, output: p.output, tier: null };
  for (const t of p.tiers ?? []) {
    if (inputTokens > t.above_input_tokens) rate = { input: t.input ?? rate.input, output: t.output ?? rate.output, tier: t };
  }
  return rate;
}

export function costFor(m, { req, inTok, outTok }) {
  if (!m.pricing || typeof m.pricing.input !== 'number' || typeof m.pricing.output !== 'number') return null;
  const r = rateFor(m.pricing, inTok);
  return { total: (req * (inTok * r.input + outTok * r.output)) / 1e6, tier: r.tier };
}

export function costText(c) {
  if (!c) return null;
  const digits = c.total < 1 ? 4 : 2;
  return `$${c.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: digits })}`;
}

function priceCell(m, key, label) {
  const p = m.pricing;
  if (!p) return `<td class="num" data-label="${label}">${key === 'input' ? '<span class="na">Not available</span>' : NA}</td>`;
  const v = money(p[key]);
  const notes = [];
  for (const t of p.tiers ?? []) if (t[key] !== undefined && t[key] !== null) notes.push(`&gt;${int(t.above_input_tokens)} input: ${money(t[key])}`);
  for (const s of p.scheduled ?? []) if (s[key] !== undefined && s[key] !== null) notes.push(`from ${s.effective_date}: ${money(s[key])}`);
  return `<td class="num" data-label="${label}">${v ?? NA}${notes.map((n) => `<small>${n}</small>`).join('')}</td>`;
}

function batchCell(m) {
  const p = m.pricing;
  const label = 'Batch in / out';
  if (!p || (p.batch_input == null && p.batch_output == null)) return `<td class="num" data-label="${label}">${NA}</td>`;
  return `<td class="num" data-label="${label}">${money(p.batch_input) ?? NA} / ${money(p.batch_output) ?? NA}</td>`;
}

function statusCell(m) {
  const extra = [];
  if (m.deprecation_date) extra.push(`deprecated ${m.deprecation_date}`);
  if (m.retirement_date) extra.push(`${m.status === 'retired' ? 'retired' : 'retires'} ${m.retirement_date}`);
  return `<td data-label="Status"><span class="st st-${m.status}">${STATUS[m.status]}</span>${extra.map((e) => `<small>${e}</small>`).join('')}</td>`;
}

export function rowHtml(m, { cost = null, showCost = false, selected = false, disabled = false } = {}) {
  const api = m.api_id ? `<code>${esc(m.api_id)}</code>` : '<small>API id: n/a</small>';
  const name = m.announcement_url ? `<a href="${esc(m.announcement_url)}" rel="noopener" target="_blank">${esc(m.name)}</a>` : esc(m.name);
  let costCell = '';
  if (showCost) {
    const tier = cost?.tier ? `<small>&gt;${int(cost.tier.above_input_tokens)} input rate</small>` : '';
    costCell = `<td class="num cost" data-label="Est. monthly cost">${cost ? costText(cost) + tier : '<span class="na">Not available</span>'}</td>`;
  }
  return `<tr data-id="${esc(m.id)}">`
    + `<td class="c-cmp"><input type="checkbox" class="cmp" value="${esc(m.id)}" aria-label="Compare ${esc(m.name)}"${selected ? ' checked' : ''}${disabled && !selected ? ' disabled' : ''}></td>`
    + `<th scope="row" class="c-model" data-label="Model"><span class="name">${name}</span><span class="prov">${esc(m.provider)}</span>${api}</th>`
    + costCell
    + statusCell(m)
    + priceCell(m, 'input', 'Input $/1M')
    + priceCell(m, 'output', 'Output $/1M')
    + priceCell(m, 'cached_input', 'Cached input $/1M')
    + batchCell(m)
    + `<td class="num" data-label="Context">${int(m.context_window)}</td>`
    + `<td class="num" data-label="Max output">${int(m.max_output_tokens) ?? NA}</td>`
    + `<td data-label="Input → output">${esc(modalities(m))}</td>`
    + `<td data-label="Open weights">${esc(openWeights(m))}</td>`
    + `<td class="num" data-label="Released">${m.release_date ?? NA}</td>`
    + `<td class="c-src" data-label="Verified">verified ${m.last_verified}<span class="src">${sourceLinks(m)}</span></td>`
    + '</tr>';
}

// ---- Changelog ----

function fmtValue(field, v) {
  if (v === null || v === undefined) return 'n/a';
  if (typeof v === 'number') return /pric|input|output|cache|batch/.test(field) && !/tokens|context/.test(field) ? money(v) : int(v);
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

// Seed entries are grouped into one line per date so the initial pass doesn't swamp real changes.
export function groupChangelog(changelog) {
  const out = [];
  const seeds = new Map();
  for (const c of changelog) {
    if (c.type === 'seed') {
      if (!seeds.has(c.date)) {
        const g = { date: c.date, type: 'seed', count: 0, providers: new Set() };
        seeds.set(c.date, g);
        out.push(g);
      }
      seeds.get(c.date).count++;
      seeds.get(c.date).providers.add(c.provider);
    } else out.push(c);
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function changeText(c, nameOf) {
  if (c.type === 'seed') return `Initial research pass: ${c.count} model${c.count === 1 ? '' : 's'} from ${c.providers.size === 1 ? esc([...c.providers][0]) : `${c.providers.size} providers`} added.`;
  const name = esc(nameOf(c.model_id));
  if (c.type === 'launch') return `${name} added.`;
  return `${name}: ${esc(c.field)} ${esc(fmtValue(c.field, c.old))} → ${esc(fmtValue(c.field, c.new))}.`;
}

export function changelogItem(c, nameOf) {
  const src = c.source ? ` <a href="${esc(c.source)}" rel="noopener" target="_blank">source<span class="vh"> (opens in new tab)</span></a>` : '';
  const note = c.note && c.type !== 'seed' ? ` <span class="muted">${esc(c.note)}</span>` : '';
  return `<li><time datetime="${c.date}">${c.date}</time> <span class="tag tag-${c.type}">${c.type}</span> ${changeText(c, nameOf)}${note}${src}</li>`;
}

// ---- This week ----

export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Facts from the last 7 days plus dated events in the next 60 days, each with its source.
export function weekItems(models, changelog, today) {
  const from = addDays(today, -7);
  const until = addDays(today, 60);
  const recent = [];
  const upcoming = [];
  const srcFor = (m, field) => m.sources.find((s) => s.fields.includes(field))?.url ?? null;
  for (const m of models) {
    if (m.release_date && m.release_date >= from && m.release_date <= today) recent.push({ date: m.release_date, type: 'launch', text: `${esc(m.name)} released (${esc(m.provider)}).`, src: m.announcement_url ?? srcFor(m, 'release_date') });
    if (m.deprecation_date && m.deprecation_date >= from && m.deprecation_date <= today) recent.push({ date: m.deprecation_date, type: 'status', text: `${esc(m.name)} deprecated.`, src: srcFor(m, 'status') });
    if (m.retirement_date && m.retirement_date > today && m.retirement_date <= until) upcoming.push({ date: m.retirement_date, type: 'status', text: `${esc(m.name)} retires.`, src: srcFor(m, 'status') });
    for (const s of m.pricing?.scheduled ?? []) {
      if (s.effective_date > today && s.effective_date <= until) {
        upcoming.push({ date: s.effective_date, type: 'price', text: `${esc(m.name)} price changes to ${money(s.input) ?? 'n/a'} input / ${money(s.output) ?? 'n/a'} output per 1M.`, src: srcFor(m, 'pricing') });
      }
    }
  }
  const names = new Map(models.map((m) => [m.id, m.name]));
  for (const c of changelog) {
    if (c.type !== 'seed' && c.date >= from && c.date <= today) recent.push({ date: c.date, type: c.type, text: changeText(c, (id) => names.get(id) ?? id), src: c.source });
  }
  const byDate = (dir) => (a, b) => (a.date < b.date ? -dir : a.date > b.date ? dir : 0);
  return { recent: recent.sort(byDate(-1)), upcoming: upcoming.sort(byDate(1)) };
}

export function weekHtml({ recent, upcoming }) {
  const li = (i) => `<li><time datetime="${i.date}">${i.date}</time> <span class="tag tag-${i.type}">${i.type}</span> ${i.text}${i.src ? ` <a href="${esc(i.src)}" rel="noopener" target="_blank">source<span class="vh"> (opens in new tab)</span></a>` : ''}</li>`;
  return `<div class="week-col"><h3>Last 7 days</h3>${recent.length ? `<ul class="events">${recent.map(li).join('')}</ul>` : '<p class="muted">No launches, price changes or deprecations recorded in the last 7 days.</p>'}</div>`
    + `<div class="week-col"><h3>Coming up (next 60 days)</h3>${upcoming.length ? `<ul class="events">${upcoming.map(li).join('')}</ul>` : '<p class="muted">No announced price changes or retirements in the next 60 days.</p>'}</div>`;
}

// ---- CSV ----

export function toCsv(models) {
  const cols = [
    ['id', (m) => m.id], ['provider', (m) => m.provider], ['name', (m) => m.name], ['api_id', (m) => m.api_id],
    ['status', (m) => m.status], ['release_date', (m) => m.release_date], ['deprecation_date', (m) => m.deprecation_date],
    ['retirement_date', (m) => m.retirement_date],
    ...['input', 'output', 'cached_input', 'cache_write', 'batch_input', 'batch_output'].map((k) => [`price_${k}_usd_per_1m`, (m) => m.pricing?.[k]]),
    ['price_tiers_json', (m) => (m.pricing?.tiers ? JSON.stringify(m.pricing.tiers) : null)],
    ['price_scheduled_json', (m) => (m.pricing?.scheduled ? JSON.stringify(m.pricing.scheduled) : null)],
    ['context_window', (m) => m.context_window], ['max_output_tokens', (m) => m.max_output_tokens],
    ['input_modalities', (m) => m.modalities.input?.join(';')], ['output_modalities', (m) => m.modalities.output?.join(';')],
    ['open_weights', (m) => m.open_weights.available], ['license', (m) => m.open_weights.license],
    ['availability', (m) => m.availability.join(';')], ['last_verified', (m) => m.last_verified],
    ['sources', (m) => m.sources.map((s) => s.url).join(' ')],
  ];
  const cell = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.map(([h]) => h).join(','), ...models.map((m) => cols.map(([, f]) => cell(f(m))).join(','))].join('\n') + '\n';
}

// ---- Table head and sorting ----

export const SORTS = {
  default: { label: 'Provider (default)', key: null },
  name: { label: 'Model name', key: (m) => m.name.toLowerCase() },
  provider: { label: 'Provider', key: (m) => m.provider.toLowerCase() },
  cost: { label: 'Est. monthly cost', key: null },
  status: { label: 'Status', key: (m) => ['preview', 'ga', 'available', 'deprecated', 'retired'].indexOf(m.status) },
  input: { label: 'Input price', key: (m) => m.pricing?.input ?? null },
  output: { label: 'Output price', key: (m) => m.pricing?.output ?? null },
  cached: { label: 'Cached input price', key: (m) => m.pricing?.cached_input ?? null },
  batch: { label: 'Batch input price', key: (m) => m.pricing?.batch_input ?? null },
  context: { label: 'Context window', key: (m) => m.context_window },
  maxout: { label: 'Max output', key: (m) => m.max_output_tokens },
  released: { label: 'Release date', key: (m) => m.release_date },
};

// Missing values always sort last, whichever direction.
export function sortModels(list, keyFn, dir) {
  return list
    .map((m, i) => ({ m, i, k: keyFn(m) }))
    .sort((a, b) => {
      const an = a.k === null || a.k === undefined;
      const bn = b.k === null || b.k === undefined;
      if (an || bn) return an && bn ? a.i - b.i : an ? 1 : -1;
      if (a.k < b.k) return -dir;
      if (a.k > b.k) return dir;
      return a.i - b.i;
    })
    .map((x) => x.m);
}

export function headHtml({ showCost = false, sort = 'default', dir = 1 } = {}) {
  const th = (label, key, cls = '') => {
    if (!key) return `<th scope="col"${cls ? ` class="${cls}"` : ''}>${label}</th>`;
    const aria = sort === key ? ` aria-sort="${dir === 1 ? 'ascending' : 'descending'}"` : '';
    const arrow = sort === key ? (dir === 1 ? ' ▲' : ' ▼') : '';
    return `<th scope="col"${cls ? ` class="${cls}"` : ''}${aria}><button type="button" class="sort" data-sort="${key}">${label}<span aria-hidden="true">${arrow}</span></button></th>`;
  };
  return '<th scope="col" class="c-cmp"><span class="vh">Compare</span></th>'
    + th('Model', 'name')
    + (showCost ? th('Est. monthly cost', 'cost', 'num') : '')
    + th('Status', 'status')
    + th('Input $/1M', 'input', 'num')
    + th('Output $/1M', 'output', 'num')
    + th('Cached input', 'cached', 'num')
    + th('Batch in / out', 'batch', 'num')
    + th('Context', 'context', 'num')
    + th('Max output', 'maxout', 'num')
    + th('Input → output')
    + th('Open weights')
    + th('Released', 'released', 'num')
    + th('Verified / sources');
}
