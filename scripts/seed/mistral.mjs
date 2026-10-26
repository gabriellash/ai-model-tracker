import { model } from './lib.mjs';

const PRICING = 'https://docs.mistral.ai/inference/pricing';
const page = (m) => `https://docs.mistral.ai/models/${m}`;
const ow = (license) => ({ available: true, license });

// Max output is not stated on Mistral's model pages, so it stays null.
const mistral = ({ page: pg, ...o }) => model({ provider: 'Mistral', pricing_url: PRICING, spec_url: page(pg), ...o });

export default [
  mistral({ slug: 'mistral-large-4', name: 'Mistral Large 4', api_id: null, page: 'mistral-large-4-0', status: 'preview', release_date: '2026-10-06',
    pricing: { input: 1.36, output: 4.18, cached_input: 0.14 }, context_window: 1_000_000, input: ['text', 'image'], open_weights: ow(null) }),
  mistral({ slug: 'mistral-medium-3-5', name: 'Mistral Medium 3.5', api_id: 'mistral-medium-3-5', page: 'mistral-medium-3-5-26-04', release_date: '2026-04-28',
    pricing: { input: 1.5, output: 7.5, cached_input: 0.15 }, context_window: 256_000, input: ['text', 'image'], open_weights: ow('Modified MIT') }),
  mistral({ slug: 'mistral-small-4', name: 'Mistral Small 4', api_id: 'mistral-small-2603', page: 'mistral-small-4-0-26-03', release_date: '2026-03-16',
    pricing: { input: 0.15, output: 0.6, cached_input: 0.015 }, context_window: 256_000, open_weights: ow('Apache-2.0') }),
  mistral({ slug: 'mistral-large-3', name: 'Mistral Large 3', api_id: 'mistral-large-2512', page: 'mistral-large-3-25-12', release_date: '2025-12-02',
    pricing: { input: 0.5, output: 1.5, cached_input: 0.05 }, context_window: 256_000, input: ['text', 'image'], open_weights: ow('Apache-2.0') }),
  mistral({ slug: 'ministral-3-14b', name: 'Ministral 3 14B', api_id: 'ministral-14b-2512', page: 'ministral-3-14b-25-12', release_date: '2025-12-02',
    pricing: { input: 0.2, output: 0.2, cached_input: 0.02 }, context_window: 256_000, open_weights: ow('Apache-2.0') }),
  mistral({ slug: 'ministral-3-8b', name: 'Ministral 3 8B', api_id: 'ministral-8b-2512', page: 'ministral-3-8b-25-12', release_date: '2025-12-02',
    pricing: { input: 0.15, output: 0.15, cached_input: 0.015 }, context_window: 256_000, input: ['text', 'image'], open_weights: ow('Apache-2.0') }),
  mistral({ slug: 'ministral-3-3b', name: 'Ministral 3 3B', api_id: 'ministral-3b-2512', page: 'ministral-3-3b-25-12', release_date: '2025-12-02',
    pricing: { input: 0.1, output: 0.1, cached_input: 0.01 }, context_window: 256_000, input: ['text', 'image'], open_weights: ow('Apache-2.0') }),
  mistral({ slug: 'codestral', name: 'Codestral 25.08', api_id: 'codestral-2508', page: 'codestral-25-08', release_date: '2025-07-30',
    pricing: { input: 0.3, output: 0.9, cached_input: 0.03 }, context_window: 128_000 }),
];
