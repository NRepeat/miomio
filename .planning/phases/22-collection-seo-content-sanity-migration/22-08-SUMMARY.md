---
phase: 22-collection-seo-content-sanity-migration
plan: 08
subsystem: testing
tags: [playwright, e2e, seo, i18n, sanity]

# Dependency graph
requires:
  - phase: 22-collection-seo-content-sanity-migration
    provides: "Plan 01 stub spec + playwright project entry, Plan 04 widget aria-label and curtain labels, Plan 05 brand-page widget wiring, Plan 07 live Sanity data + MANIFEST handle truth"
provides:
  - "26-test Playwright suite verifying SEO section presence + h2 + localized curtain button across 13 routes × 2 locales"
  - "Goal-backward integration gate for the entire phase 22 chain (schema → query → widget → routes → data)"
affects: [collection-seo, future Sanity content edits, future widget refactors]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Scoped role queries (parent.getByRole) to dodge strict-mode collisions on shared labels"]

key-files:
  created: []
  modified:
    - tests/e2e/collection-seo.spec.ts

key-decisions:
  - "Curtain button locator scoped to [aria-label='SEO description'] section — collection routes also render a Show-More pagination button with identical label"
  - "Spec asserts on the same handles the importer MANIFEST writes (helena-soretti, baletky-ta-mokasyny) — single source of truth"
  - "Failing routes are NOT skipped or fixme'd — assertion failure on missing Sanity data is the intended signal"

patterns-established:
  - "E2E SEO smoke: route-list × locale-list parameterization with shared assertion helper"

requirements-completed: [E2E]

# Metrics
duration: 9min
completed: 2026-05-22
---

# Phase 22 Plan 08: Collection SEO content presence e2e spec Summary

**Replaced Plan 01's 13-route fixme'd stub with a real 26-test (13 routes × 2 locales) Playwright spec asserting SEO section visibility, h2 heading, and localized curtain button — 18/26 pass; 8 fail on routes lacking published Sanity content (out-of-scope follow-up).**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-22T09:41:28Z
- **Completed:** 2026-05-22T09:50:30Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- All `test.fixme` markers removed; spec now executes real assertions on every route
- Doubled coverage from 13 (uk-only) to 26 (uk + ru) tests via locale parameterization
- Handles aligned with `scripts/import-seo-md.mjs` MANIFEST/LEGACY_MIGRATION ground truth (`helena-soretti`, `baletky-ta-mokasyny`)
- Curtain-button locator scoped to SEO section to avoid strict-mode collision with collection-grid load-more buttons sharing the same Ukrainian/Russian label

## Task Commits

1. **Task 1: Replace fixme'd e2e stub with real assertions across 13 routes × 2 locales** — `6bbaba93` (test)

**Plan metadata:** _final-commit_ (docs: complete plan)

## Files Created/Modified
- `tests/e2e/collection-seo.spec.ts` — Real Playwright spec: 13 routes × 2 locales = 26 parameterized tests, shared `assertSeoSection` helper, no fixme/skip

## Test Run Results (against `npm run dev` on localhost:3000)

**Total:** 18 passed / 8 failed / 0 skipped — 26 tests, ~2.2 min runtime.

### Passing (18)

All 7 new (brand + woman/baletky-ta-mokasyny) on `uk` — 7 tests.
All 6 brand routes on `ru` — 6 tests.
Legacy on `uk`: zhinoche-vzuttya, krosivky-ta-kedy (woman), oksfordy-ta-lofery, sabo-ta-myuli, choloviche-vzuttya — 5 tests.

### Failing (8) — Missing Sanity data, NOT a code issue

Each failure has identical signature: `[aria-label="SEO description"]` element absent from SSR HTML (confirmed via `curl | grep -c "SEO description" == 0`), causing the visibility expect to time out at 15s. The widget renders nothing when the GROQ `COLLECTION_SEO_QUERY` returns no published doc for the surface/handle/locale combination.

| # | Route | Cause |
|---|-------|-------|
| 1 | `ru /woman/baletky-ta-mokasyny` | RU translation post not visible (UA passes) — likely draft or missing translation.metadata link |
| 2 | `ru /woman/zhinoche-vzuttya` | Legacy migration RU sibling missing |
| 3 | `ru /woman/krosivky-ta-kedy` | Legacy migration RU sibling missing |
| 4 | `ru /woman/oksfordy-ta-lofery` | Legacy migration RU sibling missing |
| 5 | `ru /woman/sabo-ta-myuli` | Legacy migration RU sibling missing |
| 6 | `ru /man/choloviche-vzuttya` | Legacy migration RU sibling missing |
| 7 | `uk /man/krosivky-ta-kedy` | UA + RU both missing for the male-collection mapping (uk also fails) |
| 8 | `ru /man/krosivky-ta-kedy` | (same legacy entry as #7) |

**Root cause hypothesis:** The 6 LEGACY_MIGRATION entries point at pre-existing `imported-seo-{slug}-ua` post IDs (created by `import-seo-blog.mjs`), but the corresponding RU sibling docs and `translation.metadata` links may not yet be published, or the `collectionSeo` mapping doc itself is in draft. The widget query (`@/shared/sanity/lib/query.ts COLLECTION_SEO_QUERY`) filters published docs only.

**Resolution path (out of scope for this plan, per plan execution_notes):**
1. Open Sanity Studio at `/studio`.
2. Locate `collectionSeo` documents for the 6 legacy mappings and ensure each is published (not draft).
3. For the male-collection mapping (`man/krosivky-ta-kedy`), verify the UA post `imported-seo-cholovichi-krosivky-ta-kedy-ua` is published.
4. For all 6 legacy + the `baletky-ta-mokasyny` woman entry, verify each UA post has a sibling RU post and a `translation.metadata` doc linking the pair.
5. Re-run `npx playwright test tests/e2e/collection-seo.spec.ts --reporter=line` — should reach 26/26.

## Decisions Made
- **Failing routes left unskipped.** The spec's job is to surface data gaps; downgrading to `test.skip` would mask them. Plan 08's acceptance criteria says "Use `test.skip(condition, reason)` only if a specific route legitimately cannot render" — these failures are content-gap signals worth keeping visible until the Sanity Studio cleanup is done.
- **`waitUntil: 'domcontentloaded'`** instead of the default `'load'` — Next.js dev pages with Shopify product grids never hit `load` quickly enough for a 15s budget; DOM ready is sufficient for SSR'd SEO content.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Installed missing Playwright browser binary**
- **Found during:** Task 1 (first test run)
- **Issue:** `npx playwright test` failed all 26 cases with "Executable doesn't exist at .../chrome-headless-shell" — chromium binary not installed in local cache after a Playwright version bump
- **Fix:** Ran `npx playwright install chromium`
- **Files modified:** none (binary cache only)
- **Verification:** Next test run reached actual assertions instead of failing on launch
- **Committed in:** n/a (no source change)

**2. [Rule 1 — Bug] Scoped curtain-button locator to the SEO section**
- **Found during:** Task 1 (first real test run after browser install)
- **Issue:** `page.getByRole('button', { name: 'Показати більше' })` violated Playwright strict mode on brand pages — two buttons match: the SEO curtain AND a collection-grid load-more button that shares the same Ukrainian/Russian label
- **Fix:** Changed locator from `page.getByRole(...)` to `seo.getByRole(...)` where `seo = page.locator('[aria-label="SEO description"]')`, restricting the search to inside the SEO section
- **Files modified:** `tests/e2e/collection-seo.spec.ts`
- **Verification:** Strict-mode error gone on all 26 cases; brand routes (which previously hit this) now pass on uk + ru
- **Committed in:** `6bbaba93` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking infrastructure, 1 bug in the spec under construction)
**Impact on plan:** Both fixes essential for the spec to execute; no scope creep. The spec body now matches the plan's `<action>` block with the necessary locator-scoping correction the plan-time copy could not anticipate.

## Issues Encountered

- **Dev-server not auto-spawned:** `playwright.config.ts` only spawns `npm run start` under `CI=true`; locally it expects an already-running dev server. Per plan execution_notes, dev server was started in the background, awaited via curl loop, run during the suite, and shut down after.
- **Eight failing routes (documented above):** Not blocking for this plan — the spec is correct; the failures expose a Sanity content gap to be resolved in Studio.

## User Setup Required

**No environment-level setup is needed for the spec itself**, but to drive the suite to 26/26 green someone with Sanity Studio editor access must:

1. Visit `/studio` (Sanity Studio) on the deployed environment or via `npm run dev` locally.
2. Publish any draft `collectionSeo` mapping documents for the 6 LEGACY_MIGRATION entries.
3. For each legacy UA post (`imported-seo-{slug}-ua`), confirm the sibling RU post and `translation.metadata` doc exist and are published.
4. Specifically check: `imported-seo-cholovichi-krosivky-ta-kedy-ua` (the only legacy entry where the UK locale also fails) — this suggests the UA post itself may be in draft.

## Next Phase Readiness

- **Phase 22 is functionally complete:** schema, query, widget, brand-page wiring, importer, MANIFEST verification, and now the e2e gate are all delivered.
- **Phase 22 verification is content-blocked, not code-blocked:** the spec correctly identifies the 8 routes that need their Sanity content published; once that editorial step is done, the suite will go green without further code change.
- **CI integration:** the `collection-seo` Playwright project (added in Plan 01) was preserved; CI will spawn `npm run start` itself.

## Self-Check: PASSED

- `tests/e2e/collection-seo.spec.ts` exists and contains real assertions (no `test.fixme`)
- Commit `6bbaba93` exists in `git log`
- 26 tests listed by `npx playwright test --list`
- Spec executes against live dev server with documented pass/fail breakdown

---
*Phase: 22-collection-seo-content-sanity-migration*
*Completed: 2026-05-22*
