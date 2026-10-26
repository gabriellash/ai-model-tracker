#!/usr/bin/env node
// Builds the static site into dist/. Refuses to build if validation fails, so bad data never deploys.
// Usage: node scripts/build.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { validateDataset } from './validate.mjs';
import {
  esc, rowHtml, headHtml, SORTS, groupChangelog, changelogItem, changeText, weekItems, weekHtml, toCsv,
} from '../src/lib.js';

export const SITE_URL = 'https://gabriellash.github.io/ai-model-tracker/';
export const REPO_URL = 'https://github.com/gabriellash/ai-model-tracker';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));
const out = (p, content) => writeFileSync(path.join(DIST, p), content);

const models = readJson('data/models.json');
const changelog = readJson('data/changelog.json');
const status = readJson('data/status.json');

const errors = validateDataset({ models, changelog, status });
if (errors.length) {
  console.error(`✗ Build stopped: validation failed with ${errors.length} error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const list = models.models;
const providers = [...new Set(list.map((m) => m.provider))];
const names = new Map(list.map((m) => [m.id, m.name]));
const nameOf = (id) => names.get(id) ?? id;
const today = new Date().toISOString().slice(0, 10);
const built = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const human = (iso) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

const version = createHash('sha256')
  .update(read('src/app.js') + read('src/lib.js') + read('src/styles.css') + read('src/sw.js') + JSON.stringify([models, changelog, status]))
  .digest('hex').slice(0, 10);

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// ---- Data downloads ----
copyFileSync(path.join(ROOT, 'data/models.json'), path.join(DIST, 'models.json'));
copyFileSync(path.join(ROOT, 'data/changelog.json'), path.join(DIST, 'changelog.json'));
copyFileSync(path.join(ROOT, 'data/status.json'), path.join(DIST, 'status.json'));
copyFileSync(path.join(ROOT, 'data/schema.json'), path.join(DIST, 'schema.json'));
out('models.csv', toCsv(list));

// ---- Atom feed of the changelog ----
const xml = (s) => esc(s).replace(/&#39;/g, '&apos;');
const stripTags = (s) => s.replace(/<[^>]+>/g, '');
const decode = (s) => s.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const groups = groupChangelog(changelog);
const feedEntries = groups.slice(0, 100).map((c, i) => {
  const title = decode(stripTags(changeText(c, nameOf)));
  const id = c.type === 'seed' ? `${SITE_URL}#seed-${c.date}` : `${SITE_URL}#change-${c.date}-${c.model_id}-${c.field}-${i}`;
  const link = c.source ?? SITE_URL;
  return `  <entry>
    <title>${xml(title)}</title>
    <id>${xml(id)}</id>
    <updated>${c.date}T00:00:00Z</updated>
    <link href="${xml(link)}"/>
    <summary>${xml(`${c.date} · ${c.type} · ${title}${c.source ? ` Source: ${c.source}` : ''}`)}</summary>
  </entry>`;
});
out('feed.xml', `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>AI Model Tracker changelog</title>
  <subtitle>Launches, price changes, spec changes and deprecations, each with its official source.</subtitle>
  <link href="${SITE_URL}"/>
  <link rel="self" href="${SITE_URL}feed.xml"/>
  <id>${SITE_URL}</id>
  <updated>${status.last_changed}</updated>
  <author><name>AI Model Tracker</name></author>
${feedEntries.join('\n')}
</feed>
`);

// ---- Images: icons and Open Graph image ----
const png = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: true } }).render().asPng();
const icon = read('src/icon.svg');
out('icon.svg', icon);
out('icon-192.png', png(icon, 192));
out('icon-512.png', png(icon, 512));
out('apple-touch-icon.png', png(icon, 180));
const maskable = icon.replace('rx="12"', 'rx="0"').replace('<path d="M12 44', '<g transform="translate(6.4 6.4) scale(0.8)"><path d="M12 44').replace('</svg>', '</g></svg>');
out('icon-maskable-512.png', png(maskable, 512));
const og = read('src/og.svg')
  .replace('{{COUNT}}', String(list.length))
  .replace('{{PROVIDERS}}', String(providers.length))
  .replace('{{CHECKED_DATE}}', status.last_checked.slice(0, 10));
out('og.png', png(og, 1200));

out('manifest.webmanifest', JSON.stringify({
  name: 'AI Model Tracker',
  short_name: 'Model Tracker',
  description: 'AI model prices, context windows and releases from official provider pages.',
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: '#0e1013',
  theme_color: '#0e1013',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2));

// ---- Page ----
const description = `${list.length} AI models from ${providers.length} providers: price per 1M tokens, context window, max output and release date, each linked to the official source. Checked daily.`;
const jsonld = [
  {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'AI Model Tracker',
    description,
    url: SITE_URL,
    sameAs: REPO_URL,
    dateModified: status.last_changed,
    isAccessibleForFree: true,
    creator: { '@type': 'Organization', name: 'AI Model Tracker', url: SITE_URL },
    keywords: ['AI models', 'LLM pricing', 'context window', ...providers],
    variableMeasured: ['input price per 1M tokens (USD)', 'output price per 1M tokens (USD)', 'context window (tokens)', 'max output tokens'],
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${SITE_URL}models.json` },
      { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: `${SITE_URL}models.csv` },
    ],
  },
  { '@context': 'https://schema.org', '@type': 'WebSite', name: 'AI Model Tracker', url: SITE_URL },
];
// Inline JSON must not be able to close its <script> tag.
const safeJson = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

const providerOptions = providers.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
const sortOptions = Object.entries(SORTS).map(([k, s]) => `<option value="${k}"${k === 'cost' ? ' disabled' : ''}>${esc(s.label)}</option>`).join('');
const values = {
  DESCRIPTION: esc(description),
  SITE_URL,
  REPO_URL,
  COUNT: String(list.length),
  CHECKED_ISO: status.last_checked,
  CHECKED_HUMAN: human(status.last_checked),
  CHECKED_DATE: status.last_checked.slice(0, 10),
  CHANGED_ISO: status.last_changed,
  CHANGED_HUMAN: human(status.last_changed),
  BUILT_ISO: built,
  VERSION: version,
  JSONLD: safeJson(jsonld),
  WEEK: weekHtml(weekItems(list, changelog, today)),
  PROVIDER_OPTIONS: providerOptions,
  SORT_OPTIONS: sortOptions,
  TABLE_HEAD: headHtml(),
  TABLE_ROWS: list.map((m) => rowHtml(m)).join(''),
  CHANGELOG: groups.slice(0, 25).map((c) => changelogItem(c, nameOf)).join(''),
  DATA_JSON: safeJson({ models: list, changelog, status }),
  CSS: read('src/styles.css').replace(/\/\*[^]*?\*\//g, '').replace(/\s*\n\s*/g, '\n'),
};
const html = read('src/index.template.html').replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => {
  if (!(k in values)) throw new Error(`Unknown template placeholder ${m}`);
  return values[k];
});
out('index.html', html);
out('app.js', read('src/app.js'));
out('lib.js', read('src/lib.js'));

const shell = ['./', 'app.js', 'lib.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png'];
out('sw.js', read('src/sw.js').replace('{{VERSION}}', version).replace('{{SHELL}}', JSON.stringify(shell)));

// ---- SEO files ----
out('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`);
out('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}</loc><lastmod>${status.last_changed.slice(0, 10)}</lastmod></url>
</urlset>
`);
out('.nojekyll', '');

console.log(`✓ Built dist/ (${list.length} models, ${providers.length} providers, version ${version})`);
