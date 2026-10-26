import { model } from './lib.mjs';

const PRICING = 'https://api-docs.deepseek.com/quick_start/pricing/';
const UPDATES = 'https://api-docs.deepseek.com/updates';

// Standard (peak) USD prices. DeepSeek also charges 50% less off-peak (outside 9-12 and 14-18 Beijing time on weekdays).
export default [
  model({ provider: 'DeepSeek', slug: 'deepseek-flash', name: 'DeepSeek V4.1 Flash', api_id: 'deepseek-flash', release_date: '2026-10-17',
    announcement_url: 'https://api-docs.deepseek.com/news/news261017',
    pricing: { input: 0.3, output: 1.2, cached_input: 0.006 }, context_window: 1_000_000, max_output_tokens: 384_000,
    input: ['text', 'image'], open_weights: { available: true, license: null },
    pricing_url: PRICING, spec_url: PRICING,
    extra_sources: [{ url: 'https://api-docs.deepseek.com/news/news261017', fields: ['release_date', 'open_weights'] }] }),
  model({ provider: 'DeepSeek', slug: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', api_id: 'deepseek-v4-pro', release_date: '2026-08-13',
    pricing: { input: 1.32, output: 3.96, cached_input: 0.044 }, context_window: 1_000_000, max_output_tokens: 384_000,
    open_weights: { available: null, license: null },
    pricing_url: PRICING, spec_url: PRICING,
    extra_sources: [{ url: UPDATES, fields: ['release_date'] }] }),
];
