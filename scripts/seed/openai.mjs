import { model } from './lib.mjs';

const PRICING = 'https://developers.openai.com/api/docs/pricing';
const DEPRECATIONS = 'https://developers.openai.com/api/docs/deprecations';
const CHANGELOG = 'https://developers.openai.com/api/docs/changelog';
const page = (m) => `https://developers.openai.com/api/docs/models/${m}`;

// Long-context rates apply to input over 272K tokens.
const LONG = 272_000;
const tier = (input, cached_input, output) => [{ above_input_tokens: LONG, input, output, cached_input }];

const gpt = ({ slug, dep, retire, changelogDate, ...o }) => model({
  provider: 'OpenAI', slug, input: ['text', 'image'], pricing_url: PRICING, spec_url: page(slug),
  ...(dep ? { status: 'deprecated', deprecation_date: dep, retirement_date: retire } : {}),
  extra_sources: [
    ...(dep ? [{ url: DEPRECATIONS, fields: ['status'] }] : []),
    ...(changelogDate ? [{ url: CHANGELOG, fields: ['release_date'] }] : []),
  ],
  ...o,
});

const p = (input, cached_input, output, batch_input, batch_output, tiers) => ({ input, cached_input, output, batch_input, batch_output, ...(tiers ? { tiers } : {}) });

export default [
  gpt({ slug: 'gpt-6-astra', name: 'GPT-6 Astra', release_date: '2026-09-03', changelogDate: true, pricing: p(10, 1, 50, 5, 25, tier(20, 2, 75)), context_window: 1_050_000, max_output_tokens: 128_000 }),
  gpt({ slug: 'gpt-6.1-sol', name: 'GPT-6.1 Sol', release_date: '2026-09-29', changelogDate: true, pricing: p(2, 0.1, 10, 1, 5, tier(4, 0.2, 15)), context_window: 1_050_000, max_output_tokens: 128_000 }),
  gpt({ slug: 'gpt-6-sol', name: 'GPT-6 Sol', release_date: '2026-09-22', changelogDate: true, pricing: p(2, 0.2, 10, 1, 5, tier(4, 0.4, 15)), context_window: 1_050_000, max_output_tokens: 128_000 }),
  gpt({ slug: 'gpt-6-luna', name: 'GPT-6 Luna', release_date: '2026-09-22', changelogDate: true, pricing: p(0.1, 0.01, 0.5, 0.05, 0.25, tier(0.2, 0.02, 0.75)), context_window: 1_050_000, max_output_tokens: 128_000 }),
  gpt({ slug: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', release_date: '2026-07-09', changelogDate: true, pricing: p(4, 0.4, 20, 2, 10, tier(8, 0.8, 30)), context_window: 1_050_000, max_output_tokens: 128_000 }),
  gpt({ slug: 'gpt-5.6-terra', name: 'GPT-5.6 Terra', release_date: '2026-07-09', changelogDate: true, pricing: p(2, 0.2, 12, 1, 6, tier(4, 0.4, 18)), context_window: 1_050_000, max_output_tokens: 128_000 }),
  gpt({ slug: 'gpt-5.6-luna', name: 'GPT-5.6 Luna', release_date: '2026-07-09', changelogDate: true, pricing: p(0.2, 0.02, 1.2, 0.1, 0.6, tier(0.4, 0.04, 1.8)), context_window: 1_050_000, max_output_tokens: 128_000 }),
  gpt({ slug: 'gpt-5.5', name: 'GPT-5.5', release_date: '2026-04-23', pricing: p(5, 0.5, 30, 2.5, 15, tier(10, 1, 45)), context_window: 1_050_000, max_output_tokens: 128_000 }),
  gpt({ slug: 'gpt-5.5-pro', name: 'GPT-5.5 Pro', release_date: '2026-04-23', pricing: p(30, null, 180, 15, 90, tier(60, null, 270)), context_window: 1_050_000, max_output_tokens: 128_000 }),
  gpt({ slug: 'gpt-5.4', name: 'GPT-5.4', release_date: '2026-03-05', pricing: p(2.5, 0.25, 15, 1.25, 7.5, tier(5, 0.5, 22.5)), context_window: 1_050_000, max_output_tokens: 128_000 }),
  gpt({ slug: 'gpt-5.4-pro', name: 'GPT-5.4 Pro', release_date: '2026-03-05', pricing: p(30, null, 180, 15, 90, tier(60, null, 270)), context_window: 1_050_000, max_output_tokens: 128_000 }),
  gpt({ slug: 'gpt-5.4-mini', name: 'GPT-5.4 mini', release_date: '2026-03-17', pricing: p(0.75, 0.075, 4.5, 0.375, 2.25), context_window: 400_000, max_output_tokens: 128_000 }),
  gpt({ slug: 'gpt-5.4-nano', name: 'GPT-5.4 nano', release_date: '2026-03-17', dep: '2026-10-01', retire: '2027-04-01', pricing: p(0.2, 0.02, 1.25, 0.1, 0.625), context_window: 400_000, max_output_tokens: 128_000 }),
  gpt({ slug: 'gpt-5.2', name: 'GPT-5.2', release_date: '2025-12-11', pricing: p(1.75, 0.175, 14, 0.875, 7), context_window: 400_000, max_output_tokens: 128_000 }),
  gpt({ slug: 'gpt-5.2-pro', name: 'GPT-5.2 Pro', release_date: '2025-12-11', pricing: p(21, null, 168, 10.5, 84), context_window: 400_000, max_output_tokens: 128_000 }),
  gpt({ slug: 'gpt-5.1', name: 'GPT-5.1', release_date: '2025-11-13', dep: '2026-10-01', retire: '2027-04-01', pricing: p(1.25, 0.125, 10, 0.625, 5), context_window: 400_000, max_output_tokens: 128_000 }),
  gpt({ slug: 'gpt-5', name: 'GPT-5', release_date: '2025-08-07', dep: '2026-06-11', retire: '2026-12-11', pricing: p(1.25, 0.125, 10, 0.625, 5), context_window: 400_000, max_output_tokens: 128_000 }),
  gpt({ slug: 'gpt-5-mini', name: 'GPT-5 mini', release_date: '2025-08-07', dep: '2026-06-11', retire: '2026-12-11', pricing: p(0.25, 0.025, 2, 0.125, 1), context_window: 400_000, max_output_tokens: 128_000 }),
  gpt({ slug: 'gpt-5-nano', name: 'GPT-5 nano', release_date: '2025-08-07', dep: '2026-06-11', retire: '2026-12-11', pricing: p(0.05, 0.005, 0.4, 0.025, 0.2), context_window: 400_000, max_output_tokens: 128_000 }),
  gpt({ slug: 'gpt-5-pro', name: 'GPT-5 Pro', release_date: '2025-10-06', dep: '2026-06-11', retire: '2026-12-11', pricing: p(15, null, 120, 7.5, 60), context_window: 400_000, max_output_tokens: 272_000 }),
  gpt({ slug: 'gpt-4.1', name: 'GPT-4.1', release_date: '2025-04-14', dep: '2026-10-14', retire: '2027-01-14', pricing: p(2, 0.5, 8, 1, 4), context_window: 1_047_576, max_output_tokens: 32_768 }),
  gpt({ slug: 'gpt-4.1-mini', name: 'GPT-4.1 mini', release_date: '2025-04-14', dep: '2026-10-14', retire: '2027-01-14', pricing: p(0.4, 0.1, 1.6, 0.2, 0.8), context_window: 1_047_576, max_output_tokens: 32_768 }),
  gpt({ slug: 'gpt-4o', name: 'GPT-4o', release_date: '2024-08-06', dep: '2026-10-14', retire: '2027-01-14', pricing: p(2.5, 1.25, 10, 1.25, 5), context_window: 128_000, max_output_tokens: 16_384 }),
  gpt({ slug: 'gpt-4o-mini', name: 'GPT-4o mini', release_date: '2024-07-18', dep: '2026-10-14', retire: '2027-01-14', pricing: p(0.15, 0.075, 0.6, 0.075, 0.3), context_window: 128_000, max_output_tokens: 16_384 }),
  gpt({ slug: 'o3', name: 'o3', release_date: '2025-04-16', dep: '2026-06-11', retire: '2026-12-11', pricing: p(2, 0.5, 8, 1, 4), context_window: 200_000, max_output_tokens: 100_000 }),
  gpt({ slug: 'o3-pro', name: 'o3-pro', release_date: '2025-06-10', dep: '2026-06-11', retire: '2026-12-11', pricing: p(20, null, 80, 10, 40), context_window: 200_000, max_output_tokens: 100_000 }),
];
