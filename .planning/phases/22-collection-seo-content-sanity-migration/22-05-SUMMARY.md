---
phase: 22-collection-seo-content-sanity-migration
plan: 05
subsystem: ui
tags: [nextjs, sanity, seo, brand, widget-integration]

# Dependency graph
requires:
  - phase: 22-collection-seo-content-sanity-migration
    provides: CollectionSeoContent widget refactored to multi-surface props (surface, gender?, handle, locale) — plan 22-04
provides:
  - Brand page (`app/[locale]/(frontend)/brand/[slug]/page.tsx`) renders CollectionSeoContent after BrandGrid Suspense
  - Brand routes now have an SEO copy section identical in placement to gender-collection routes
  - Wired surface="brand" usage of the locked D-04 prop shape
affects: [22-06, 22-07, 22-08, brand-seo, collection-seo-content]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Widget invocation outside Suspense boundary to preserve streaming/LCP (Pitfall 5)"
    - "Multi-surface widget reuse — single component covers brand + gender surfaces via `surface` discriminator (D-04)"

key-files:
  created: []
  modified:
    - "app/[locale]/(frontend)/brand/[slug]/page.tsx"

key-decisions:
  - "Used barrel import @widgets/collection-seo-content (not deep path) per project FSD convention"
  - "Passed handle={decodedSlug} (existing variable) — did not introduce a renamed local"
  - "No gender prop on brand surface (omitted, not undefined) — matches D-04 optional contract"
  - "Widget placed after </Suspense> but inside <div className=\"container\"> — matches D-05/D-06 and Pattern 8"

patterns-established:
  - "Brand-page SEO integration pattern: single JSX element after grid Suspense, inside container, no extra wrapper"

requirements-completed: [BRAND-INTEGRATION]

# Metrics
duration: 1min
completed: 2026-05-22
---

# Phase 22 Plan 05: Brand Page SEO Widget Integration Summary

**Brand pages now render `CollectionSeoContent` after the `BrandGrid` Suspense — single import + 5-line JSX addition wires all 6 manifest brand routes into the Sanity-driven SEO copy pipeline.**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-05-22T09:26:24Z
- **Completed:** 2026-05-22T09:27:28Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added `CollectionSeoContent` import (barrel path `@widgets/collection-seo-content`)
- Inserted `<CollectionSeoContent surface="brand" handle={decodedSlug} locale={locale} />` after the `BrandGrid` Suspense, inside the existing `<div className="container">`
- Placement honors Pitfall 5 (outside Suspense to keep streaming/LCP clean) and D-05 (no layout/CSS change)
- Brand routes (Bikkembergs, Premiata, Barracuda, Voile Blanche, Bogner, Helena Scoretti) are now wired — content will appear once plan 22-07 imports the articles

## Task Commits

1. **Task 1: Add CollectionSeoContent to brand page after BrandGrid** — `1d339c0a` (feat)

## Files Created/Modified

- `app/[locale]/(frontend)/brand/[slug]/page.tsx` — Added widget import (line 12) and JSX usage (lines 80-84) after BrandGrid Suspense, inside container

## Decisions Made

- **Barrel import:** Used `@widgets/collection-seo-content` rather than deep `./ui/CollectionSeoContent` path — matches FSD widget-export convention and the plan's explicit instruction.
- **Variable reuse:** Passed `handle={decodedSlug}` since the file already resolves the decoded slug for `getCollection`/`generateBrandMetadata`. No new variable introduced.
- **Omit `gender` prop:** Brand surface doesn't carry a gender — left the prop out entirely (D-04 makes it optional).
- **No extra Suspense:** Widget renders nothing on miss and the underlying GROQ fetch is cached 3600s, so no fallback wrapper is needed.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

### Parallel-execution race with plan 22-04 (expected, not a deviation)

`npx tsc --noEmit` reports one error against the new JSX:

```
app/[locale]/(frontend)/brand/[slug]/page.tsx(81,9): error TS2322:
  Type '{ surface: string; handle: string; locale: string; }' is not assignable to type 'IntrinsicAttributes & Props'.
  Property 'surface' does not exist on type 'IntrinsicAttributes & Props'.
```

This is the documented parallel-race contract from the executor prompt: plan 22-04 (running concurrently) owns the widget prop-shape refactor (`{ gender, handle, locale }` → `{ surface, gender?, handle, locale }`). The CONTEXT.md D-04 prop shape is locked, and this plan authored the brand-page edit against that locked shape per orchestrator instruction. The TS error resolves automatically once 22-04 lands.

No other TypeScript errors were introduced by this change (verified via `npx tsc --noEmit | grep -E "error TS"` — only the single expected error appears).

The collection page (`app/[locale]/(frontend)/(home)/[gender]/(collection)/[slug]/page.tsx:197`) will also fail to type-check until 22-04 updates its call site to include `surface="gender"`; that fix is also 22-04's responsibility.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Brand page rendering is wired — once 22-04 lands (widget refactor) and 22-07 lands (article import + `collectionSeo` upsert for the 6 brand entries), all 6 brand routes will render the SEO section.
- Plan 22-08 will smoke-test all 13 routes (6 brand + 7 gender) end-to-end.
- No blockers introduced by this plan.

## Self-Check: PASSED

- File `app/[locale]/(frontend)/brand/[slug]/page.tsx` exists and contains `CollectionSeoContent` import + JSX — VERIFIED via Read
- Commit `1d339c0a` exists in git log — VERIFIED via `git log --oneline`
- Acceptance criteria 1–3 (grep checks) PASS
- Acceptance criterion 4 (tsc clean) blocked on parallel 22-04 — documented under Issues Encountered, not a deviation
- Acceptance criterion 5 (diff review: only intended additions) PASS

---
*Phase: 22-collection-seo-content-sanity-migration*
*Completed: 2026-05-22*
