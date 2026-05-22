import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID = path.resolve(__dirname, '../fixtures/md/valid-two-h1.md');
const INVALID = path.resolve(__dirname, '../fixtures/md/invalid-one-h1.md');

// Dynamic import so the script's CLI-guard skips main() under vitest
// (process.argv[1] is the vitest runner, not import-seo-md.mjs).
const importerPromise = import('../../scripts/import-seo-md.mjs');

describe('import-seo-md parser & manifest', () => {
  it('valid fixture contains exactly two # H1 lines', () => {
    const md = readFileSync(VALID, 'utf8');
    const h1Count = md.split('\n').filter((l) => /^#\s/.test(l)).length;
    expect(h1Count).toBe(2);
  });

  it('invalid fixture contains exactly one # H1 line', () => {
    const md = readFileSync(INVALID, 'utf8');
    const h1Count = md.split('\n').filter((l) => /^#\s/.test(l)).length;
    expect(h1Count).toBe(1);
  });

  it('MANIFEST contains 7 entries with correct surface distribution', async () => {
    const { MANIFEST } = await importerPromise;
    expect(MANIFEST).toHaveLength(7);
    expect(MANIFEST.filter((e) => e.surface === 'brand')).toHaveLength(6);
    expect(MANIFEST.filter((e) => e.surface === 'gender')).toHaveLength(1);
    const womanEntry = MANIFEST.find((e) => e.surface === 'gender');
    expect(womanEntry.gender).toBe('woman');
    expect(womanEntry.collectionHandle).toBe('zhinochi-baletky-ta-mokasyny');
  });

  it('MANIFEST handles match CONTEXT D-16', async () => {
    const { MANIFEST } = await importerPromise;
    const handles = MANIFEST.map((e) => e.collectionHandle).sort();
    expect(handles).toEqual([
      'barracuda',
      'bikkembergs',
      'bogner',
      'helena-scoretti',
      'premiata',
      'voile-blanche',
      'zhinochi-baletky-ta-mokasyny',
    ]);
  });

  it('LEGACY_MIGRATION contains 6 entries pointing at imported-seo-*-ua post IDs', async () => {
    const { LEGACY_MIGRATION } = await importerPromise;
    expect(LEGACY_MIGRATION).toHaveLength(6);
    for (const e of LEGACY_MIGRATION) {
      expect(e.postId).toMatch(/^imported-seo-.*-ua$/);
      expect(['woman', 'man']).toContain(e.gender);
      expect(e.surface).toBe('gender');
    }
  });

  it('buildCollectionSeo emits a weak reference doc of type collectionSeo', async () => {
    const { buildCollectionSeo } = await importerPromise;
    const doc = buildCollectionSeo({
      surface: 'brand',
      collectionHandle: 'bikkembergs',
      postId: 'imported-seo-md-bikkembergs-ua',
      title: 'Bikkembergs (brand)',
    });
    expect(doc._type).toBe('collectionSeo');
    expect(doc.surface).toBe('brand');
    expect(doc.collectionHandle).toBe('bikkembergs');
    expect(doc.gender).toBeUndefined();
    expect(doc.post._ref).toBe('imported-seo-md-bikkembergs-ua');
    expect(doc.post._weak).toBe(true);
    expect(doc.post._strengthenOnPublish).toEqual({ type: 'post' });
    expect(doc._id).toBe('imported-collection-seo-brand-bikkembergs');
  });

  it('buildCollectionSeo includes gender when surface=gender', async () => {
    const { buildCollectionSeo } = await importerPromise;
    const doc = buildCollectionSeo({
      surface: 'gender',
      gender: 'woman',
      collectionHandle: 'zhinoche-vzuttya',
      postId: 'imported-seo-zhinoche-vzuttia-ua',
      title: 'Жіноче взуття (legacy)',
    });
    expect(doc.gender).toBe('woman');
    expect(doc._id).toBe('imported-collection-seo-gender-woman-zhinoche-vzuttya');
  });

  it('mdFileToHtml accepts the valid fixture and yields two <h1> elements in the HTML', async () => {
    const { mdFileToHtml } = await importerPromise;
    const html = await mdFileToHtml(VALID);
    const h1Count = (html.match(/<h1[^>]*>/g) ?? []).length;
    expect(h1Count).toBe(2);
  });

  it('processFile rejects .md files whose H1 count != 2', async () => {
    const { processFile } = await importerPromise;
    await expect(processFile(INVALID)).rejects.toThrow(
      /Expected exactly 2 H1s/,
    );
  });

  it('processFile parses the valid fixture into UA + RU sections', async () => {
    const { processFile } = await importerPromise;
    const { uk, ru, sourceUrl } = await processFile(VALID);
    expect(sourceUrl).toMatch(/^https?:/);
    expect(uk.title).toBe('Приклад заголовка українською');
    expect(ru.title).toBe('Пример заголовка по-русски');
    expect(uk.slug).toMatch(/^[a-z0-9-]+$/);
    expect(ru.slug).toMatch(/^[a-z0-9-]+$/);
    expect(uk.blocks.length).toBeGreaterThan(0);
    expect(ru.blocks.length).toBeGreaterThan(0);
  });

  it('buildPost hardcodes language and hideFromBlogList', async () => {
    const { buildPost } = await importerPromise;
    const doc = buildPost({
      language: 'ua',
      title: 'Test',
      slug: 'test',
      description: 'desc',
      blocks: [],
      publishedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(doc.language).toBe('ua');
    expect(doc.hideFromBlogList).toBe(true);
    expect(doc._id).toBe('imported-seo-md-test-ua');
    expect(doc._type).toBe('post');
  });
});
