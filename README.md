# AI Model Tracker

A single-page reference of AI model prices (USD per 1M tokens), context windows, max output and releases, built
only from providers' official pages and re-checked every morning by Claude.

**Live site:** https://gabriellash.github.io/ai-model-tracker/

Every value on the page links to the official page it came from. Anything a provider does not state is shown as
"n/a" or "not available"; nothing is estimated.

## How it works

```
data/models.json      the data: one entry per model, with sources and last_verified
data/changelog.json   append-only history of every change, each with a source URL
data/status.json      when the daily job last checked / last changed something (written by the workflow)
data/schema.json      JSON Schema for all three files
scripts/validate.mjs  schema + sanity checks; nothing is committed or deployed unless this passes
scripts/guard.mjs     compares the data with the last commit and decides: clean, flagged or fail
scripts/build.mjs     validates, then renders dist/ (page, CSV, Atom feed, sitemap, icons, OG image, service worker)
src/                  page template, styles, browser code (src/lib.js is shared by the build and the browser)
prompts/daily-update.md   instructions for the daily Claude run
```

- **The page** is plain HTML, CSS and JavaScript. The build renders the full table into the HTML, so it loads fast
  and works without JavaScript. JavaScript adds search, filters, sorting, the cost calculator, compare mode (2–4
  models), URL state (every view is a shareable link), dark/light theme and offline support (service worker).
- **Freshness dot** in the header: green when the last check was under 36 hours ago, amber under 72 hours, red
  otherwise. It is computed in your browser from `status.json`, so if the daily job stops, the dot turns amber, then
  red, on its own.
- **Downloads:** `models.json`, `models.csv`, `changelog.json` and an Atom feed (`feed.xml`) of the changelog.

### The daily job (`.github/workflows/daily-update.yml`)

Runs at 06:00 Europe/Berlin (two UTC crons, 04:00 and 05:00; a first step continues only when it is 06:xx in
Berlin, so it is right in summer and winter). GitHub can start scheduled runs late when it is busy.

1. **research**: Claude Code (`anthropics/claude-code-action`) reads `prompts/daily-update.md`, checks each
   provider's official pages, edits `data/models.json` / `data/changelog.json`, and writes a run summary.
   - Tools: WebSearch, WebFetch, Read, Edit, Write, Glob, Grep and only one shell command,
     `node scripts/validate.mjs`. No git, no gh, no other shell.
   - The job's GitHub token is read-only, so text on a web page cannot make the agent push or change anything.
   - After the agent: `validate` then `guard`.
2. **publish** (only if the guard says clean or flagged): takes **only** the two data files from step 1, validates
   and guards them again, updates `status.json`, then
   - **clean** → commits to main: `data: daily update 2026-10-27 (3 changes)` (or `(no changes)`, which still records
     the check time so the dot stays green);
   - **flagged** → pushes branch `data/review-<date>` and opens a PR labelled `needs-review`. Main is not touched.
3. **deploy** rebuilds the site after a commit to main.

**The guard** (`scripts/guard.mjs`):

| Result | When | What happens |
|---|---|---|
| fail | a model was removed; an existing changelog entry was edited; a changed value has no changelog entry with an `https` source and the same new value; a file other than the two data files was touched; validation failed | nothing is committed, the run fails (GitHub emails you), the site keeps its data and the dot ages |
| flagged | a price moved more than 50%; a context window changed more than 4×; more than 10 models changed in one run; a new provider appeared | PR for review |
| clean | anything else | commit to main and deploy |

A price change that matches an announced `pricing.scheduled` entry whose date has arrived is listed in the report
but not flagged.

## Run it locally

Needs Node 20 or newer.

```sh
npm ci
npm run table      # print the data as a table in the terminal (npm run table -- Google for one provider)
npm test           # validator and guard tests
npm run preview    # build and serve at http://localhost:4173/ai-model-tracker/
```

### The validator rejecting a broken file

`tests/fixtures/broken-models.json` is deliberately wrong (negative price, duplicate id, missing source, `"128k"`
as a string, retired model without a date, impossible context window, `http://` source, a date in the future):

```sh
node scripts/validate.mjs --models tests/fixtures/broken-models.json --changelog tests/fixtures/empty-changelog.json
```

It exits with code 1 and lists every problem. `npm test` checks each expected error is reported.

## Running the daily update by hand

- GitHub website: **Actions → daily-update → Run workflow**.
- Terminal: `gh workflow run daily-update.yml -R gabriellash/ai-model-tracker`, then `gh run watch`.

Manual runs skip the 06:00 check. Each run's page shows the guard report, the agent's summary and the usage and
cost Claude Code reported.

Repository settings the job needs:

- Secret `ANTHROPIC_API_KEY` (Settings → Secrets and variables → Actions). Never commit a key.
- Settings → Actions → General → Workflow permissions: tick **"Allow GitHub Actions to create and approve pull
  requests"** (needed for flagged runs).
- Optional variables: `CLAUDE_MODEL` (default `claude-sonnet-5-5`), `CLAUDE_MAX_TURNS` (default `200`).

## Cost per run

Not measured yet. After the first real run, the run's summary page shows the cost Claude Code reported
(`total_cost_usd`), turns, tokens and web searches. That number will go here.

## Reviewing a flagged PR

1. Open the PR labelled `needs-review`. Its description lists each flagged item, every change (old → new) with its
   source link, and the agent's summary.
2. Open each source link and check the new value is on that page.
3. Everything correct → **merge**. The merge triggers the deploy.
   Something wrong → fix it on the PR branch (edit `data/models.json` and the matching `data/changelog.json` entry),
   or close the PR. The next morning's run starts again from main.

Pull requests opened by the workflow's own token do not trigger the `ci` workflow (a GitHub rule), so run
`npm test` locally if you edit the branch. The deploy validates again before publishing either way.

## Adding a provider

1. Add the provider's official pricing, models and changelog URLs to the table in `prompts/daily-update.md`.
2. Either let the next run add its models (a new provider is always flagged for review), or add entries to
   `data/models.json` by hand following `data/schema.json`, with a `launch` changelog entry for each model.
3. If the provider sells through a cloud platform not in the `availability` list, add it to the enum in
   `data/schema.json`.
4. `npm test && npm run validate`, then commit.

## Data conventions

- Prices are USD per 1M text tokens on the provider's own API, standard tier, as published.
  `pricing: null` = no official per-token price published ("price: not available" on the page).
- Long-context tiers are stored as published. When a page writes "200k", it is stored as 200,000 (providers do not
  say whether k means 1,000 or 1,024).
- Status "Available (status not stated)" = listed and callable, but the provider does not say "generally
  available". "Generally available" is used only when a provider states it.
- `null` anywhere = the provider does not state it.
- Amazon Nova 2 Lite max output is 65,536 from the Nova 2 user guide (its Bedrock model card says "64K").

## Disclaimer

Data is collected automatically and can be out of date or wrong. Check with the provider before relying on it.
Not affiliated with any provider listed; names are trademarks of their owners.
