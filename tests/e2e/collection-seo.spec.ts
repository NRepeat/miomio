import { test, expect } from '@playwright/test';

const ROUTES = [
  // 7 new (Plan 07 data)
  '/uk/brand/bikkembergs',
  '/uk/brand/premiata',
  '/uk/brand/barracuda',
  '/uk/brand/voile-blanche',
  '/uk/brand/bogner',
  '/uk/brand/helena-scoretti',
  '/uk/woman/zhinochi-baletky-ta-mokasyny',
  // 6 legacy
  '/uk/woman/zhinoche-vzuttya',
  '/uk/woman/krosivky-ta-kedy',
  '/uk/woman/oksfordy-ta-lofery',
  '/uk/woman/sabo-ta-myuli',
  '/uk/man/choloviche-vzuttya',
  '/uk/man/krosivky-ta-kedy',
];

test.describe('Collection SEO content presence', () => {
  for (const route of ROUTES) {
    test.fixme(`renders [aria-label="SEO description"] on ${route}`, async ({ page }) => {
      await page.goto(route);
      const seo = page.locator('[aria-label="SEO description"]');
      await expect(seo).toBeVisible();
      await expect(seo.locator('h2').first()).toBeVisible();
      await expect(page.getByRole('button', { name: /Показати більше/ })).toBeVisible();
    });
  }
});
