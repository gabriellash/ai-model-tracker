import { model } from './lib.mjs';

const MODELS = 'https://docs.cohere.com/docs/models';
const PRICING = 'https://cohere.com/pricing';

// Cohere publishes per-token prices only for some models; the rest have pricing: null ("no published price").
// The models page doesn't state open-weight status except for Command A+, so the rest are null (unknown).
const cohere = (o) => model({ provider: 'Cohere', spec_url: MODELS, pricing_url: PRICING, open_weights: { available: null, license: null }, ...o });

export default [
  cohere({ slug: 'command-a-plus-05-2026', name: 'Command A+', release_date: '2026-05-20', announcement_url: 'https://docs.cohere.com/changelog/command-a-plus-05-2026',
    context_window: 128_000, max_output_tokens: 64_000, input: ['text', 'image'], open_weights: { available: true, license: 'Apache-2.0' },
    extra_sources: [{ url: 'https://docs.cohere.com/docs/command-a-plus', fields: ['release_date', 'open_weights', 'modalities'] }] }),
  cohere({ slug: 'command-a-reasoning-08-2025', name: 'Command A Reasoning', context_window: 256_000, max_output_tokens: 32_000 }),
  cohere({ slug: 'command-a-vision-07-2025', name: 'Command A Vision', context_window: 128_000, max_output_tokens: 8_000, input: ['text', 'image'] }),
  cohere({ slug: 'command-a-03-2025', name: 'Command A', context_window: 256_000, max_output_tokens: 8_000 }),
  cohere({ slug: 'command-r7b-12-2024', name: 'Command R7B', context_window: 128_000, max_output_tokens: 4_000 }),
  cohere({ slug: 'command-r-plus-08-2024', name: 'Command R+ 08-2024', pricing: { input: 2.5, output: 10 }, context_window: 128_000, max_output_tokens: 4_000 }),
  cohere({ slug: 'command-r-08-2024', name: 'Command R 08-2024', context_window: 128_000, max_output_tokens: 4_000 }),
  cohere({ slug: 'c4ai-aya-expanse-32b', name: 'Aya Expanse 32B', pricing: { input: 0.5, output: 1.5 }, context_window: 128_000, max_output_tokens: 4_000 }),
];
