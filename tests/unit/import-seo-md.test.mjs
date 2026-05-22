import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID = path.resolve(__dirname, '../fixtures/md/valid-two-h1.md');
const INVALID = path.resolve(__dirname, '../fixtures/md/invalid-one-h1.md');

describe('import-seo-md parser', () => {
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

  it.todo('parseMdFile rejects files with !=2 H1 blocks');
  it.todo('emits 3 docs (UA post, RU post, translation.metadata) per file');
  it.todo('emits one collectionSeo doc per manifest entry');
  it.todo('--migrate-legacy creates 6 collectionSeo docs referencing imported-seo-*-ua post IDs');
  it.todo('--dry mode commits no mutations');
});
