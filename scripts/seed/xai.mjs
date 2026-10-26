import { model } from './lib.mjs';

const MODELS = 'https://docs.x.ai/docs/models';
const page = (m) => `https://docs.x.ai/docs/models/${m}`;

// xAI publishes release months only and no max output, so both stay null.
// The higher rate applies to the whole request once the prompt reaches 200k tokens.
const grok = ({ slug, in: i, cached: c, out: o, ctx, ...rest }) => model({
  provider: 'xAI', slug, input: ['text', 'image'], pricing_url: MODELS, spec_url: page(slug), context_window: ctx,
  pricing: { input: i, cached_input: c, output: o, tiers: [{ above_input_tokens: 199_999, input: i * 2, output: o * 2, cached_input: c * 2 }] },
  ...rest,
});

export default [
  grok({ slug: 'grok-4.7', name: 'Grok 4.7', in: 2, cached: 0.5, out: 6, ctx: 500_000 }),
  grok({ slug: 'grok-4.6', name: 'Grok 4.6', in: 2, cached: 0.5, out: 6, ctx: 500_000 }),
  grok({ slug: 'grok-4.5', name: 'Grok 4.5', in: 2, cached: 0.3, out: 6, ctx: 500_000 }),
  grok({ slug: 'grok-4.3', name: 'Grok 4.3', in: 1.25, cached: 0.2, out: 2.5, ctx: 1_000_000 }),
  grok({ slug: 'grok-4.20-0309-reasoning', name: 'Grok 4.20 Reasoning', in: 1.25, cached: 0.2, out: 2.5, ctx: 1_000_000 }),
  grok({ slug: 'grok-4.20-0309-non-reasoning', name: 'Grok 4.20 Non-Reasoning', in: 1.25, cached: 0.2, out: 2.5, ctx: 1_000_000 }),
  grok({ slug: 'grok-4.20-multi-agent-0309', name: 'Grok 4.20 Multi-Agent', in: 1.25, cached: 0.2, out: 2.5, ctx: 1_000_000 }),
  grok({ slug: 'grok-build-0.1', name: 'Grok Build 0.1', in: 1, cached: 0.2, out: 2, ctx: 256_000, status: 'preview' }),
];
