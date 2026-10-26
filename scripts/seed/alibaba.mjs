import { model } from './lib.mjs';

// International (Singapore) deployment prices. Tiers apply per request by input length.
const PRICING = 'https://www.alibabacloud.com/help/en/model-studio/model-pricing';
const page = (m) => `https://www.alibabacloud.com/help/en/model-studio/${m}`;
const VISION = ['text', 'image', 'video'];

const qwen = ({ page: pg, ...o }) => model({ provider: 'Alibaba', pricing_url: PRICING, spec_url: page(pg), context_window: 1_000_000, max_output_tokens: 131_072, ...o });

export default [
  qwen({ slug: 'qwen3.8-max', name: 'Qwen3.8-Max', page: 'qwen3-8-max', release_date: '2026-09-02', input: VISION, pricing: { input: 2, output: 6 } }),
  qwen({ slug: 'qwen3.7-max', name: 'Qwen3.7-Max', page: 'qwen3-7-max', release_date: '2026-05-20', pricing: { input: 2.5, output: 7.5 } }),
  qwen({ slug: 'qwen3.7-plus', name: 'Qwen3.7-Plus', page: 'qwen3-7-plus', release_date: '2026-05-26', input: VISION,
    pricing: { input: 0.4, output: 1.6, tiers: [{ above_input_tokens: 256_000, input: 1.2, output: 4.8 }] } }),
  qwen({ slug: 'qwen3.8-flash', name: 'Qwen3.8-Flash', page: 'qwen3-8-flash', input: VISION, pricing: { input: 0.15, output: 0.47 } }),
  qwen({ slug: 'qwen3.7-flash', name: 'Qwen3.7-Flash', page: 'qwen3-7-flash', release_date: '2026-07-15', input: VISION,
    pricing: { input: 0.03, output: 0.13, batch_input: 0.015, batch_output: 0.065,
      tiers: [{ above_input_tokens: 32_000, input: 0.1, output: 0.4, batch_input: 0.05, batch_output: 0.2 }, { above_input_tokens: 256_000, input: 0.2, output: 0.8, batch_input: 0.1, batch_output: 0.4 }] } }),
  qwen({ slug: 'qwen3.8-2.4t-a95b', name: 'Qwen3.8 2.4T-A95B', page: 'qwen3-8-2-4t-a95b', pricing: { input: 2, output: 6 },
    open_weights: { available: true, license: null } }),
];
