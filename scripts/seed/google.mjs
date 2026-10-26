import { model } from './lib.mjs';

const PRICING = 'https://ai.google.dev/gemini-api/docs/pricing';
const CHANGELOG = 'https://ai.google.dev/gemini-api/docs/changelog';
const page = (m) => `https://ai.google.dev/gemini-api/docs/models/${m}`;
const ALL_IN = ['text', 'image', 'video', 'audio', 'pdf'];

// Model pages give the release month only; the exact day comes from the API changelog.
const gemini = ({ slug, ...o }) => model({
  provider: 'Google', slug, input: ALL_IN, pricing_url: PRICING, spec_url: page(slug),
  context_window: 1_048_576, max_output_tokens: 65_536,
  extra_sources: [{ url: CHANGELOG, fields: ['release_date'] }],
  ...o,
});

const p = (input, output, cached_input, batch_input, batch_output, extra = {}) => ({ input, output, cached_input, batch_input, batch_output, ...extra });
const sched = (effective_date, input, output, cached_input, batch_input, batch_output) => [{ effective_date, input, output, cached_input, batch_input, batch_output }];

export default [
  gemini({ slug: 'gemini-4-argon', name: 'Gemini 4 Argon', release_date: '2026-10-13',
    pricing: p(2, 10, 0.1, 1, 5, { scheduled: sched('2026-12-01', 4, 20, 0.2, 2, 10) }) }),
  gemini({ slug: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', release_date: '2026-09-02',
    pricing: p(0.75, 3.75, 0.075, 0.375, 1.875, { scheduled: sched('2027-01-01', 1.5, 7.5, 0.15, 0.75, 3.75) }) }),
  gemini({ slug: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', release_date: '2026-07-21',
    pricing: p(0.75, 3.75, 0.075, 0.375, 1.875, { scheduled: sched('2027-01-01', 1.5, 7.5, 0.15, 0.75, 3.75) }) }),
  gemini({ slug: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', release_date: '2026-07-21', pricing: p(0.3, 2.5, 0.03, 0.15, 1.25) }),
  gemini({ slug: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', release_date: '2026-05-07', pricing: p(0.25, 1.5, 0.025, 0.125, 0.75) }),
  gemini({ slug: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', release_date: '2026-02-19', status: 'preview',
    pricing: p(2, 12, 0.2, 1, 6, { tiers: [{ above_input_tokens: 200_000, input: 4, output: 18, cached_input: 0.4, batch_input: 2, batch_output: 9 }] }) }),
  gemini({ slug: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', release_date: '2025-12-17', status: 'preview', pricing: p(0.5, 3, 0.05, 0.25, 1.5) }),
  gemini({ slug: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', release_date: '2025-06-17',
    pricing: p(1.25, 10, 0.125, 0.625, 5, { tiers: [{ above_input_tokens: 200_000, input: 2.5, output: 15, cached_input: 0.25, batch_input: 1.25, batch_output: 7.5 }] }) }),
  gemini({ slug: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', release_date: '2025-06-17', input: ['text', 'image', 'video', 'audio'], pricing: p(0.3, 2.5, 0.03, 0.15, 1.25) }),
  gemini({ slug: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', release_date: '2025-07-22', pricing: p(0.1, 0.4, 0.01, 0.05, 0.2) }),
];
