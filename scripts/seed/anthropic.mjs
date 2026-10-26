import { model } from './lib.mjs';

const PRICING = 'https://platform.claude.com/docs/en/about-claude/pricing';
const DEPRECATIONS = 'https://platform.claude.com/docs/en/about-claude/model-deprecations';
const page = (m) => `https://platform.claude.com/docs/en/models/${m}/overview`;
const CLOUDS = ['first-party', 'aws-bedrock', 'google-vertex', 'azure'];

const claude = (o) => model({ provider: 'Anthropic', input: ['text', 'image'], availability: CLOUDS, pricing_url: PRICING, ...o });

export default [
  claude({ slug: 'claude-fable-5-1', name: 'Claude Fable 5.1', release_date: '2026-09-01', announcement_url: 'https://www.anthropic.com/claude-fable-and-mythos-5-1',
    pricing: { input: 10, output: 50, cached_input: 0.25, cache_write: 12.5, batch_input: 5, batch_output: 25 },
    context_window: 1_000_000, max_output_tokens: 128_000, spec_url: page('fable-5-1') }),
  claude({ slug: 'claude-fable-5', name: 'Claude Fable 5', release_date: '2026-06-09', announcement_url: 'https://www.anthropic.com/news/claude-fable-5-mythos-5',
    pricing: { input: 10, output: 50, cached_input: 1, cache_write: 12.5, batch_input: 5, batch_output: 25 },
    context_window: 1_000_000, max_output_tokens: 128_000, spec_url: page('fable-5') }),
  claude({ slug: 'claude-opus-5-5', name: 'Claude Opus 5.5', release_date: '2026-09-22', announcement_url: 'https://www.anthropic.com/claude-opus-5-5',
    pricing: { input: 4, output: 20, cached_input: 0.2, cache_write: 5, batch_input: 2, batch_output: 10 },
    context_window: 1_000_000, max_output_tokens: 128_000, spec_url: page('opus-5-5') }),
  claude({ slug: 'claude-opus-5', name: 'Claude Opus 5', release_date: '2026-07-24', announcement_url: 'https://www.anthropic.com/news/claude-opus-5',
    pricing: { input: 5, output: 25, cached_input: 0.5, cache_write: 6.25, batch_input: 2.5, batch_output: 12.5 },
    context_window: 1_000_000, max_output_tokens: 128_000, spec_url: page('opus-5') }),
  claude({ slug: 'claude-opus-4-8', name: 'Claude Opus 4.8', release_date: '2026-05-28',
    pricing: { input: 5, output: 25, cached_input: 0.5, cache_write: 6.25, batch_input: 2.5, batch_output: 12.5 },
    context_window: 1_000_000, max_output_tokens: 128_000, spec_url: page('opus-4-8') }),
  claude({ slug: 'claude-opus-4-7', name: 'Claude Opus 4.7', release_date: '2026-04-16', announcement_url: 'https://www.anthropic.com/news/claude-opus-4-7',
    pricing: { input: 5, output: 25, cached_input: 0.5, cache_write: 6.25, batch_input: 2.5, batch_output: 12.5 },
    context_window: 1_000_000, max_output_tokens: 128_000, spec_url: page('opus-4-7') }),
  claude({ slug: 'claude-opus-4-6', name: 'Claude Opus 4.6', release_date: '2026-02-05', announcement_url: 'https://www.anthropic.com/news/claude-opus-4-6',
    pricing: { input: 5, output: 25, cached_input: 0.5, cache_write: 6.25, batch_input: 2.5, batch_output: 12.5 },
    context_window: 1_000_000, max_output_tokens: 128_000, spec_url: page('opus-4-6') }),
  claude({ slug: 'claude-opus-4-5', name: 'Claude Opus 4.5', api_id: 'claude-opus-4-5-20251101', release_date: '2025-11-24', announcement_url: 'https://www.anthropic.com/news/claude-opus-4-5',
    pricing: { input: 5, output: 25, cached_input: 0.5, cache_write: 6.25, batch_input: 2.5, batch_output: 12.5 },
    context_window: 200_000, max_output_tokens: 64_000, spec_url: page('opus-4-5') }),
  claude({ slug: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', release_date: '2026-09-28', announcement_url: 'https://www.anthropic.com/claude-sonnet-5-5',
    pricing: { input: 2, output: 10, cached_input: 0.1, cache_write: 2.5, batch_input: 1, batch_output: 5 },
    context_window: 1_000_000, max_output_tokens: 128_000, spec_url: page('sonnet-5-5') }),
  claude({ slug: 'claude-sonnet-5', name: 'Claude Sonnet 5', release_date: '2026-06-30', announcement_url: 'https://www.anthropic.com/news/claude-sonnet-5',
    pricing: { input: 2, output: 10, cached_input: 0.2, cache_write: 2.5, batch_input: 1, batch_output: 5 },
    context_window: 1_000_000, max_output_tokens: 128_000, spec_url: page('sonnet-5') }),
  claude({ slug: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', release_date: '2026-02-17', announcement_url: 'https://www.anthropic.com/news/claude-sonnet-4-6',
    pricing: { input: 3, output: 15, cached_input: 0.3, cache_write: 3.75, batch_input: 1.5, batch_output: 7.5 },
    context_window: 1_000_000, max_output_tokens: 128_000, spec_url: page('sonnet-4-6') }),
  claude({ slug: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', api_id: 'claude-sonnet-4-5-20250929', release_date: '2025-09-29', announcement_url: 'https://www.anthropic.com/news/claude-sonnet-4-5',
    status: 'deprecated', deprecation_date: '2026-09-30', retirement_date: '2026-11-30',
    pricing: { input: 3, output: 15, cached_input: 0.3, cache_write: 3.75, batch_input: 1.5, batch_output: 7.5 },
    context_window: 200_000, max_output_tokens: 64_000, spec_url: page('sonnet-4-5'),
    extra_sources: [{ url: DEPRECATIONS, fields: ['status'] }] }),
  claude({ slug: 'claude-haiku-5-5', name: 'Claude Haiku 5.5', release_date: '2026-10-07', announcement_url: 'https://www.anthropic.com/claude-haiku-5-5',
    pricing: { input: 0.1, output: 0.5, cached_input: 0.01, cache_write: 0.125, batch_input: 0.05, batch_output: 0.25,
      tiers: [{ above_input_tokens: 100_000, input: 0.5, output: 2.5, cached_input: 0.05, cache_write: 0.625, batch_input: 0.25, batch_output: 1.25 }] },
    context_window: 1_000_000, max_output_tokens: 128_000, spec_url: page('haiku-5-5') }),
  claude({ slug: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', api_id: 'claude-haiku-4-5-20251001', release_date: '2025-10-15', announcement_url: 'https://www.anthropic.com/news/claude-haiku-4-5',
    pricing: { input: 1, output: 5, cached_input: 0.1, cache_write: 1.25, batch_input: 0.5, batch_output: 2.5 },
    context_window: 200_000, max_output_tokens: 64_000, spec_url: page('haiku-4-5') }),
];
