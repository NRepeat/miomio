/**
 * E2E — Collection SEO content presence (Phase 22)
 *
 * Verifies the goal-backward chain delivered by phase 22:
 *   Sanity schema → COLLECTION_SEO_QUERY → CollectionSeoContent widget →
 *   gender + brand routes → import-seo-md.mjs MANIFEST → live Sanity data.
 *
 * Asserts on each of 13 routes × 2 locales (26 tests):
 *   - <section aria-label="SEO description"> is visible
 *   - The section contains an <h2>
 *   - The localized "show more" curtain button is visible
 *     (`Показати більше` for /uk, `Показать больше` for /ru)
 *
 * Routes come from scripts/import-seo-md.mjs MANIFEST (7 new) +
 * LEGACY_MIGRATION (6 existing). Handles match the live Shopify catalog
 * (verified in Plan 06): `helena-soretti` (single 'c'),
 * `baletky-ta-mokasyny` (no gender prefix).
 */
import { test, expect, type Page } from '@playwright/test';

type RouteSpec = {
  label: string;
  pathSegment: string; // path after /[locale], e.g. 'brand/bikkembergs' or 'woman/zhinoche-vzuttya'
};

const ROUTES: RouteSpec[] = [
  // 7 new (Plan 07 data — handles match scripts/import-seo-md.mjs MANIFEST)
  { label: 'brand/bikkembergs', pathSegment: 'brand/bikkembergs' },
  { label: 'brand/premiata', pathSegment: 'brand/premiata' },
  { label: 'brand/barracuda', pathSegment: 'brand/barracuda' },
  { label: 'brand/voile-blanche', pathSegment: 'brand/voile-blanche' },
  { label: 'brand/bogner', pathSegment: 'brand/bogner' },
  { label: 'brand/helena-soretti', pathSegment: 'brand/helena-soretti' },
  { label: 'woman/baletky-ta-mokasyny', pathSegment: 'woman/baletky-ta-mokasyny' },
  // 6 legacy (LEGACY_MIGRATION in scripts/import-seo-md.mjs)
  { label: 'woman/zhinoche-vzuttya', pathSegment: 'woman/zhinoche-vzuttya' },
  { label: 'woman/krosivky-ta-kedy', pathSegment: 'woman/krosivky-ta-kedy' },
  { label: 'woman/oksfordy-ta-lofery', pathSegment: 'woman/oksfordy-ta-lofery' },
  { label: 'woman/sabo-ta-myuli', pathSegment: 'woman/sabo-ta-myuli' },
  { label: 'man/choloviche-vzuttya', pathSegment: 'man/choloviche-vzuttya' },
  { label: 'man/krosivky-ta-kedy', pathSegment: 'man/krosivky-ta-kedy' },
];

const LOCALES = [
  { code: 'uk', showLabel: 'Показати більше' },
  { code: 'ru', showLabel: 'Показать больше' },
];

async function assertSeoSection(page: Page, showLabel: string) {
  const seo = page.locator('[aria-label="SEO description"]');
  await expect(seo, 'SEO description section is visible').toBeVisible({ timeout: 15_000 });
  await expect(seo.locator('h2').first(), 'SEO section contains an h2').toBeVisible();
  // Scope curtain button lookup to the SEO section — the page may also render
  // an unrelated "Показати більше" / "Показать больше" button (e.g. collection
  // load-more pagination on /[locale]/[gender]/[slug] routes).
  await expect(
    seo.getByRole('button', { name: showLabel }),
    `curtain button labelled "${showLabel}" exists inside SEO section`,
  ).toBeVisible();
}

test.describe('Collection SEO content — render parity across 13 routes × 2 locales', () => {
  for (const route of ROUTES) {
    for (const locale of LOCALES) {
      test(`${locale.code} /${route.pathSegment}`, async ({ page }) => {
        await page.goto(`/${locale.code}/${route.pathSegment}`, { waitUntil: 'domcontentloaded' });
        await assertSeoSection(page, locale.showLabel);
      });
    }
  }
});
