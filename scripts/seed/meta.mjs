import { model } from './lib.mjs';

const LLAMA4_CARD = 'https://dev.meta.ai/llama/docs/model-cards-and-prompt-formats/llama4/';
const LLAMA4_BLOG = 'https://ai.meta.com/blog/llama-4-multimodal-intelligence/';
const MUSE_API = 'https://dev.meta.ai/resources/blog/build-with-muse-spark/';
const MUSE_BLOG = 'https://ai.meta.com/blog/introducing-muse-spark-meta-model-api/';

export default [
  model({ provider: 'Meta', slug: 'muse-spark-1.1', name: 'Muse Spark 1.1', api_id: 'muse-spark-1.1', status: 'preview', release_date: '2026-07-09',
    announcement_url: MUSE_BLOG, pricing: { input: 1.25, output: 4.25 }, context_window: 1_000_000,
    input: ['text', 'image', 'audio', 'video', 'pdf'], pricing_url: MUSE_API, spec_url: MUSE_BLOG }),
  // Open weights; Meta lists no first-party per-token price for these.
  model({ provider: 'Meta', slug: 'llama-4-maverick', name: 'Llama 4 Maverick', api_id: null, announcement_url: LLAMA4_BLOG,
    context_window: 1_000_000, input: ['text', 'image'], open_weights: { available: true, license: null }, availability: ['self-hosted'],
    spec_url: LLAMA4_CARD, extra_sources: [{ url: LLAMA4_BLOG, fields: ['open_weights'] }] }),
  model({ provider: 'Meta', slug: 'llama-4-scout', name: 'Llama 4 Scout', api_id: null, announcement_url: LLAMA4_BLOG,
    context_window: 10_000_000, input: ['text', 'image'], open_weights: { available: true, license: null }, availability: ['self-hosted'],
    spec_url: LLAMA4_CARD, extra_sources: [{ url: LLAMA4_BLOG, fields: ['open_weights'] }] }),
];
