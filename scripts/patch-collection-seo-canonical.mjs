#!/usr/bin/env node
/**
 * Phase 22 follow-up — fix locale-canonical handle mismatch surfaced by dev check.
 *
 * Background:
 *   The collection page redirects to `canonicalHandle` from Shopify, which is
 *   locale-specific (e.g. `/ru/woman/baletky-ta-mokasyny` redirects to
 *   `/ru/woman/baletki-i-mokasiny`). The widget receives the locale-canonical
 *   handle, but `collectionSeo` docs were created with only the UA handle.
 *
 * This script upserts additional `collectionSeo` mapping docs for the 6 RU
 * (and 1 UA) canonical handles discovered via live dev navigation. All point
 * to the same UA post (the RU sibling is resolved through translation.metadata).
 *
 * Idempotent — uses deterministic `_id` so re-runs are safe.
 *
 * Usage:
 *   node scripts/patch-collection-seo-canonical.mjs --dry   # preview
 *   node scripts/patch-collection-seo-canonical.mjs         # write
 */
import { createClient } from '@sanity/client';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env' });
loadEnv({ path: '.env.server' });

const DRY = process.argv.includes('--dry');

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'ru43j1ro',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'development',
  apiVersion: '2025-10-19',
  token: process.env.SANITY_API_TOKEN || process.env.SANITY_API_READ_TOKEN,
  useCdn: false,
});

// Each entry: route locale → real canonical handle → which UA post it should point to.
// Verified via Chrome navigation in the dev environment on 2026-05-22.
const PATCHES = [
  {
    surface: 'gender',
    gender: 'man',
    collectionHandle: 'krosivky-ta-kedy-cholovichi',
    postId: 'imported-seo-cholovichi-krosivky-ta-kedy-ua',
    locale: 'uk',
  },
  {
    surface: 'gender',
    gender: 'man',
    collectionHandle: 'krossovki-i-kedy-muzhskie',
    postId: 'imported-seo-cholovichi-krosivky-ta-kedy-ua',
    locale: 'ru',
  },
  {
    surface: 'gender',
    gender: 'woman',
    collectionHandle: 'krossovki-i-kedy-zhenskie',
    postId: 'imported-seo-zhinochi-krosivky-ta-kedy-ua',
    locale: 'ru',
  },
  {
    surface: 'gender',
    gender: 'woman',
    collectionHandle: 'oksfordy-i-lofery',
    postId: 'imported-seo-zhinochi-oksfordy-ta-lofery-ua',
    locale: 'ru',
  },
  {
    surface: 'gender',
    gender: 'woman',
    collectionHandle: 'sabo-i-myuli',
    postId: 'imported-seo-zhinochi-sabo-ta-miuli-ua',
    locale: 'ru',
  },
  {
    surface: 'gender',
    gender: 'woman',
    collectionHandle: 'baletki-i-mokasiny',
    postId: 'imported-seo-md-zhinochi-baletky-i-mokasyny-ua',
    locale: 'ru',
  },
];

function buildSeoDoc({ surface, gender, collectionHandle, postId, locale }) {
  return {
    _id: `imported-collection-seo-${surface}-${gender}-${collectionHandle}`,
    _type: 'collectionSeo',
    title: `${gender} / ${collectionHandle} (${locale} canonical)`,
    surface,
    gender,
    collectionHandle,
    post: {
      _type: 'reference',
      _ref: postId,
      _weak: true,
      _strengthenOnPublish: { type: 'post' },
    },
  };
}

// Verify all target posts exist before writing
const postIds = [...new Set(PATCHES.map((p) => p.postId))];
const existing = await client.fetch(`*[_id in $ids]._id`, { ids: postIds });
const missing = postIds.filter((id) => !existing.includes(id));
if (missing.length) {
  console.error(`Missing post IDs in Sanity:\n  - ${missing.join('\n  - ')}`);
  process.exit(1);
}
console.log(`All ${postIds.length} target posts exist in Sanity.`);

console.log(`\nPatching ${PATCHES.length} collectionSeo mappings. dry=${DRY}\n`);

if (DRY) {
  for (const p of PATCHES) {
    const doc = buildSeoDoc(p);
    console.log(
      `  • ${doc._id}\n    surface=${p.surface} gender=${p.gender} handle=${p.collectionHandle}\n    → ${p.postId}`,
    );
  }
  console.log('\nDry run — no writes. Re-run without --dry to apply.');
  process.exit(0);
}

const tx = client.transaction();
for (const p of PATCHES) {
  tx.createOrReplace(buildSeoDoc(p));
}
const res = await tx.commit();
console.log(`Committed ${res.results.length} mutations:`);
for (const r of res.results) console.log(`  ✓ ${r.id} (${r.operation})`);
console.log('\nDone. The 6 affected RU routes (and 1 UA man route) should now render SEO copy.');
