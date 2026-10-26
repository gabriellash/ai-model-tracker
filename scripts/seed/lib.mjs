// Helpers for the one-off seed pass. Each provider file exports an array built with model().
export const VERIFIED = '2026-10-26';

export function model({
  provider, slug, name, api_id = slug, release_date = null, status = 'ga',
  deprecation_date = null, retirement_date = null, announcement_url = null,
  pricing = null, context_window, max_output_tokens = null,
  input = ['text'], output = ['text'], open_weights = null, availability = ['first-party'],
  pricing_url = null, spec_url, extra_sources = [],
}) {
  const sources = [];
  if (pricing) sources.push({ url: pricing_url, fields: ['pricing'] });
  // A field is attributed to the spec page only when no more specific source is given for it.
  const elsewhere = new Set(extra_sources.flatMap((s) => s.fields));
  const specFields = ['context_window'];
  if ((input !== null || output !== null) && !elsewhere.has('modalities')) specFields.push('modalities');
  if (max_output_tokens !== null && !elsewhere.has('max_output_tokens')) specFields.push('max_output_tokens');
  if (release_date && !elsewhere.has('release_date')) specFields.push('release_date');
  if (open_weights && open_weights.available !== null) specFields.push('open_weights');
  if (pricing_url === spec_url && pricing) sources[0].fields.push(...specFields);
  else sources.push({ url: spec_url, fields: specFields });
  sources.push(...extra_sources);

  return {
    id: `${provider.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${slug}`,
    provider,
    name,
    api_id,
    release_date,
    status,
    deprecation_date,
    retirement_date,
    announcement_url,
    pricing: pricing && {
      input: pricing.input,
      output: pricing.output,
      cached_input: pricing.cached_input ?? null,
      cache_write: pricing.cache_write ?? null,
      batch_input: pricing.batch_input ?? null,
      batch_output: pricing.batch_output ?? null,
      ...(pricing.free ? { free: true } : {}),
      ...(pricing.tiers ? { tiers: pricing.tiers } : {}),
      ...(pricing.scheduled ? { scheduled: pricing.scheduled } : {}),
    },
    context_window,
    max_output_tokens,
    modalities: { input, output },
    open_weights: open_weights ?? { available: false, license: null },
    availability,
    sources,
    last_verified: VERIFIED,
  };
}

// Prices are often quoted as "batch = 50% off".
export const half = (p) => Math.round(p * 50000) / 100000;
