import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { collectionSeoType } from '@shared/sanity/schemaTypes/collectionSeoType';

const INDEX_SRC = readFileSync(
  path.resolve(__dirname, '../../src/shared/sanity/schemaTypes/index.ts'),
  'utf8',
);

describe('collectionSeoType schema', () => {
  it('exports a defineType document named "collectionSeo"', () => {
    expect(collectionSeoType.name).toBe('collectionSeo');
    expect(collectionSeoType.type).toBe('document');
  });

  it('declares all required fields', () => {
    const names = collectionSeoType.fields?.map((f: any) => f.name) ?? [];
    expect(names).toEqual(
      expect.arrayContaining(['title', 'surface', 'gender', 'collectionHandle', 'post']),
    );
  });

  it('surface field offers brand and gender options', () => {
    const surface = collectionSeoType.fields?.find((f: any) => f.name === 'surface') as any;
    const values = surface?.options?.list?.map((o: any) => o.value) ?? [];
    expect(values).toEqual(expect.arrayContaining(['brand', 'gender']));
  });

  it('gender field is hidden when surface !== gender', () => {
    const gender = collectionSeoType.fields?.find((f: any) => f.name === 'gender') as any;
    expect(typeof gender?.hidden).toBe('function');
    expect(gender.hidden({ parent: { surface: 'brand' } })).toBe(true);
    expect(gender.hidden({ parent: { surface: 'gender' } })).toBe(false);
  });

  it('post field is a weak reference to post', () => {
    const post = collectionSeoType.fields?.find((f: any) => f.name === 'post') as any;
    expect(post?.type).toBe('reference');
    expect(post?.weak).toBe(true);
    expect(post?.to).toEqual([{ type: 'post' }]);
  });

  it('is registered in schemaTypes/index.ts', () => {
    expect(INDEX_SRC).toMatch(/collectionSeoType/);
  });
});
