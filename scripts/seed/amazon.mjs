import { model } from './lib.mjs';

// The Bedrock pricing page could not be fetched during the seed pass, so pricing stays null until the daily job verifies it.
export default [
  model({ provider: 'Amazon', slug: 'nova-2-lite', name: 'Nova 2 Lite', api_id: 'amazon.nova-2-lite-v1:0', release_date: '2025-12-02',
    context_window: 1_000_000, max_output_tokens: 65_536, input: ['text', 'image', 'video', 'pdf'], availability: ['aws-bedrock'],
    spec_url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-2-lite.html',
    extra_sources: [{ url: 'https://docs.aws.amazon.com/nova/latest/nova2-userguide/what-is-nova-2.html', fields: ['max_output_tokens', 'modalities'] }] }),
];
