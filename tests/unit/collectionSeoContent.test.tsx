import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock sanityFetch BEFORE importing the component.
const sanityFetchMock = vi.fn();
vi.mock('@shared/sanity/lib/sanityFetch', () => ({
  sanityFetch: (args: unknown) => sanityFetchMock(args),
}));
// Stub the PortableText renderer but keep defineQuery so query.ts loads cleanly.
vi.mock('next-sanity', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    PortableText: () => null,
  };
});
vi.mock('@shared/sanity/components/portableText', () => ({ components: {} }));
vi.mock('@shared/lib/locale', () => ({
  normalizeLocaleForSanity: (locale: string) => (locale === 'ru' ? 'ru' : 'ua'),
}));
// Stub SeoCurtain so we do not need to render React tree.
vi.mock('@widgets/collection-seo-content/ui/SeoCurtain', () => ({
  SeoCurtain: () => null,
}));

import { CollectionSeoContent } from '@widgets/collection-seo-content/ui/CollectionSeoContent';

beforeEach(() => {
  sanityFetchMock.mockReset();
});

describe('CollectionSeoContent', () => {
  it('calls sanityFetch with COLLECTION_SEO_QUERY and gender surface params', async () => {
    sanityFetchMock.mockResolvedValueOnce({
      post: { body: [{ _type: 'block' }], language: 'ua', translations: [] },
    });
    await CollectionSeoContent({
      surface: 'gender',
      gender: 'woman',
      handle: 'zhinoche-vzuttya',
      locale: 'uk',
    });
    expect(sanityFetchMock).toHaveBeenCalledTimes(1);
    const call = sanityFetchMock.mock.calls[0][0];
    expect(call.params).toEqual({
      surface: 'gender',
      gender: 'woman',
      handle: 'zhinoche-vzuttya',
    });
    expect(call.tags).toEqual([
      'collectionSeo:gender:zhinoche-vzuttya',
      'collectionSeo',
    ]);
    expect(call.revalidate).toBe(3600);
  });

  it('passes gender as empty string (never undefined) for brand surface', async () => {
    sanityFetchMock.mockResolvedValueOnce({
      post: { body: [{ _type: 'block' }], language: 'ua', translations: [] },
    });
    await CollectionSeoContent({
      surface: 'brand',
      handle: 'bikkembergs',
      locale: 'uk',
    });
    const call = sanityFetchMock.mock.calls[0][0];
    expect(call.params.gender).toBe('');
    expect(call.tags).toEqual([
      'collectionSeo:brand:bikkembergs',
      'collectionSeo',
    ]);
  });

  it('returns null when sanityFetch returns null', async () => {
    sanityFetchMock.mockResolvedValueOnce(null);
    const out = await CollectionSeoContent({
      surface: 'brand',
      handle: 'unknown',
      locale: 'uk',
    });
    expect(out).toBeNull();
  });

  it('returns null when post body is missing', async () => {
    sanityFetchMock.mockResolvedValueOnce({
      post: { body: null, language: 'ua', translations: [] },
    });
    const out = await CollectionSeoContent({
      surface: 'brand',
      handle: 'bikkembergs',
      locale: 'uk',
    });
    expect(out).toBeNull();
  });

  it('renders RU translation when locale=ru and RU sibling exists', async () => {
    sanityFetchMock.mockResolvedValueOnce({
      post: {
        body: [{ _type: 'block', _key: 'ua' }],
        language: 'ua',
        translations: [
          {
            language: 'ru',
            body: [{ _type: 'block', _key: 'ru' }],
            title: 'RU title',
          },
        ],
      },
    });
    const result = await CollectionSeoContent({
      surface: 'brand',
      handle: 'bikkembergs',
      locale: 'ru',
    });
    expect(result).not.toBeNull();
  });

  it('falls back to UA body when locale=ru but no RU sibling exists', async () => {
    sanityFetchMock.mockResolvedValueOnce({
      post: {
        body: [{ _type: 'block', _key: 'ua' }],
        language: 'ua',
        translations: [],
      },
    });
    const result = await CollectionSeoContent({
      surface: 'brand',
      handle: 'bikkembergs',
      locale: 'ru',
    });
    expect(result).not.toBeNull();
  });
});

describe('CollectionSeoContent — source file shape', () => {
  it('contains no reference to COLLECTION_TO_POST_SLUG', async () => {
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const src = readFileSync(
      path.resolve(
        __dirname,
        '../../src/widgets/collection-seo-content/ui/CollectionSeoContent.tsx',
      ),
      'utf8',
    );
    expect(src).not.toMatch(/COLLECTION_TO_POST_SLUG/);
    expect(src).toMatch(/COLLECTION_SEO_QUERY/);
  });
});
