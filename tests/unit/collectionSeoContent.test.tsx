import { describe, it } from 'vitest';

describe('CollectionSeoContent widget', () => {
  it.todo('accepts props { surface, gender?, handle, locale }');
  it.todo('calls sanityFetch with COLLECTION_SEO_QUERY and correct params');
  it.todo('emits tags ["collectionSeo:{surface}:{handle}", "collectionSeo"]');
  it.todo('returns null when sanityFetch returns null');
  it.todo('renders post.body via PortableText when result.post.body is present');
  it.todo('selects RU translation body when locale=ru and translation exists');
  it.todo('falls back to UA body when requested locale missing');
  it.todo('contains no reference to COLLECTION_TO_POST_SLUG (constant deleted)');
});
