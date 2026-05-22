import { describe, it } from 'vitest';

describe('collectionSeoType schema', () => {
  it.todo('exports a defineType document named "collectionSeo"');
  it.todo('requires `title` (string)');
  it.todo('requires `surface` enum ["brand","gender"]');
  it.todo('makes `gender` required when surface === "gender"');
  it.todo('validates `collectionHandle` matches /^[a-z0-9-]+$/');
  it.todo('declares `post` as weak reference → post');
  it.todo('is registered in src/shared/sanity/schemaTypes/index.ts');
});
