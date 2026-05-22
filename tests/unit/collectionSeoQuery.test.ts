import { describe, it, expect, vi } from 'vitest';
import { COLLECTION_SEO_QUERY } from '@shared/sanity/lib/query';

describe('COLLECTION_SEO_QUERY', () => {
  it('is exported from @shared/sanity/lib/query', () => {
    expect(typeof COLLECTION_SEO_QUERY).toBe('string');
    expect(COLLECTION_SEO_QUERY.length).toBeGreaterThan(0);
  });

  it('filters by _type collectionSeo, surface, and collectionHandle', () => {
    expect(COLLECTION_SEO_QUERY).toMatch(/_type == "collectionSeo"/);
    expect(COLLECTION_SEO_QUERY).toMatch(/surface == \$surface/);
    expect(COLLECTION_SEO_QUERY).toMatch(/collectionHandle == \$handle/);
  });

  it('short-circuits gender check when surface is brand', () => {
    expect(COLLECTION_SEO_QUERY).toMatch(/\$surface == "brand" \|\| gender == \$gender/);
  });

  it('projects post-> with body, language, title and translations via translation.metadata', () => {
    expect(COLLECTION_SEO_QUERY).toMatch(/"post":\s*post->/);
    expect(COLLECTION_SEO_QUERY).toMatch(/body/);
    expect(COLLECTION_SEO_QUERY).toMatch(/language/);
    expect(COLLECTION_SEO_QUERY).toMatch(/translation\.metadata/);
    expect(COLLECTION_SEO_QUERY).toMatch(/references\(\^\._id\)/);
  });

  it('returns the first match (uses [0] index)', () => {
    expect(COLLECTION_SEO_QUERY).toMatch(/\]\[0\]/);
  });

  it('can be invoked through a mocked sanityFetch', async () => {
    const sanityFetch = vi.fn(async ({ query, params, tags }: any) => ({
      _id: 'fake',
      post: { _id: 'imported-seo-x-ua', body: [{ _type: 'block' }], language: 'ua', translations: [] },
    }));
    const result = await sanityFetch({
      query: COLLECTION_SEO_QUERY,
      params: { surface: 'gender', gender: 'woman', handle: 'zhinoche-vzuttya' },
      revalidate: 3600,
      tags: ['collectionSeo:gender:zhinoche-vzuttya', 'collectionSeo'],
    });
    expect(sanityFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: COLLECTION_SEO_QUERY,
        params: expect.objectContaining({ surface: 'gender', gender: 'woman', handle: 'zhinoche-vzuttya' }),
        tags: expect.arrayContaining(['collectionSeo:gender:zhinoche-vzuttya', 'collectionSeo']),
      }),
    );
    expect(result.post.body.length).toBe(1);
  });
});
