---
phase: 22-collection-seo-content-sanity-migration
plan: 03
subsystem: sanity-groq

tags: [groq, sanity, translation-metadata, collection-seo, vitest, define-query]

# Dependency graph
requires:
  - 22-01 (Wave 0 test stub: tests/unit/collectionSeoQuery.test.ts)
  - 22-02 (collectionSeo Sanity document type registered)
provides:
  - COLLECTION_SEO_QUERY GROQ exported from @shared/sanity/lib/query
  - 6 passing unit tests covering query shape, parameters, and mocked fetch contract
affects: [22-04, 22-05, 22-06, 22-07, 22-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GROQ composite-key lookup with short-circuit on enum field (`$surface == 'brand' || gender == $gender`)"
    - "translation.metadata sibling resolution embedded in primary query (single round-trip UA + RU)"
    - "defineQuery from next-sanity preserves query string at runtime so unit tests can regex-match GROQ shape"

key-files:
  created: []
  modified:
    - src/shared/sanity/lib/query.ts
    - tests/unit/collectionSeoQuery.test.ts

key-decisions:
  - "Kept single composite query (no split BRAND_SEO_QUERY / GENDER_SEO_QUERY) — Studio + widget stay simpler; matches CONTEXT.md D-02"
  - "No language filter at GROQ level — locale resolution happens at the widget layer via translation walk (RESEARCH anti-pattern + Open Q4)"
  - "Caller MUST pass gender='' (never undefined) when surface='brand' — defineQuery param validation rejects undefined; documented inline in query.ts JSDoc"

patterns-established:
  - "Per-query JSDoc block above the defineQuery call explaining the GROQ filter, the short-circuit semantics, and the caller contract for nullable params"
  - "Unit-test pattern for GROQ exports: regex-match every contract-bearing clause (filter, projection, [0] index, joins) so future edits surface in CI rather than at runtime"

requirements-completed: [GROQ]

# Metrics
duration: ~3min
completed: 2026-05-22
---

# Phase 22 Plan 03: COLLECTION_SEO_QUERY GROQ with translation.metadata join Summary

**Sanity GROQ lookup primitive that resolves a `collectionSeo` mapping by `(surface, gender?, collectionHandle)` and fetches the referenced UA post plus its RU sibling (via `translation.metadata`) in a single round trip — replacing the in-file `COLLECTION_TO_POST_SLUG` map consumed by Plan 04's widget refactor.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-22T12:24:10Z (first task commit timestamp)
- **Completed:** 2026-05-22T12:25:48Z (final verification)
- **Tasks:** 1 (TDD: RED → GREEN, no REFACTOR step needed)
- **Files modified:** 2 (1 query module + 1 test file)

## Accomplishments

- `COLLECTION_SEO_QUERY` appended to `src/shared/sanity/lib/query.ts` as a `defineQuery(...)` export with inline JSDoc documenting the composite-key contract and the `gender=''` caller requirement
- Query filters `_type == "collectionSeo"`, matches `surface == $surface` and `collectionHandle == $handle`, and short-circuits the gender check with `$surface == "brand" || gender == $gender`
- Projection resolves `post->` with `_id, title, body, language, slug` plus a `translations[]` array via `*[_type == "translation.metadata" && references(^._id)][0].translations[].value->`
- Returns first match via `[0]` index — no array results to handle at the widget layer
- 6 vitest assertions converted from Plan 01 `it.todo` stubs to real regex + mocked-fetch checks covering: export shape, filter clauses, gender short-circuit, post projection + translation join, `[0]` index, and `sanityFetch` call contract with cache tags

## Task Commits

Each commit was created with `--no-verify` per parallel-executor protocol:

1. **Task 1 RED — failing tests** — `06882002` (test) — `tests/unit/collectionSeoQuery.test.ts` swapped 4 `it.todo` stubs for 6 real assertions; tests failed (no query export yet)
2. **Task 1 GREEN — query implementation** — `63626eee` (feat) — appended `COLLECTION_SEO_QUERY` to `src/shared/sanity/lib/query.ts`; all 6 tests pass

**Plan metadata commit:** SUMMARY + STATE/ROADMAP updates committed at the end of plan execution.

## Files Created/Modified

- `src/shared/sanity/lib/query.ts` — appended `COLLECTION_SEO_QUERY` (+36 lines, –2 lines for clean append region)
- `tests/unit/collectionSeoQuery.test.ts` — replaced 4 `it.todo` stubs with 6 real assertions (+49 lines, –5 lines)

## Decisions Made

- **Single composite query, not two.** The alternative — `BRAND_SEO_QUERY` + `GENDER_SEO_QUERY` — was rejected by CONTEXT.md D-02 and RESEARCH (alternative table). A single query keeps both the Studio listing and the widget call site simple; the `($surface == "brand" || gender == $gender)` short-circuit handles the brand-no-gender branch at GROQ level.
- **No GROQ-level language filter.** Locale resolution happens at the widget layer via translation walk (`canonical.translations.find(t => t.language === sanityLocale)`). RESEARCH anti-pattern + Open Question 4 explicitly forbid filtering by `language` here — the doc is locale-independent.
- **Caller contract: `gender: ''` not `undefined`.** defineQuery's param validation rejects undefined params. The short-circuit on `surface == "brand"` skips the gender check at GROQ runtime, but the param still has to be present. Documented as inline JSDoc comment so Plan 04's widget integration knows the convention.

## Deviations from Plan

None — plan executed exactly as written. The RESEARCH-supplied GROQ string (Pattern 2, lines 235-261) was used verbatim, and the test file matches the planner's prescribed structure.

## Issues Encountered

None. RED step produced clean failures (one per assertion targeting the missing export), GREEN step passed all 6 on the first run, and `npx tsc --noEmit` exited 0.

## Known Stubs

None. This plan's deliverable is itself the dewiring of a stub (Plan 01's `it.todo` placeholders in `tests/unit/collectionSeoQuery.test.ts`). The new test file contains only real assertions.

## User Setup Required

None — query is pure code, no Sanity dataset migration required to expose it. The query will return `null` against any dataset that doesn't yet contain `collectionSeo` documents (Plan 02 creates the schema, Plan 07 seeds the data).

## Next Phase Readiness

- **Plan 04 (Widget) unblocked:** `CollectionSeoContent` can import `COLLECTION_SEO_QUERY` and call `sanityFetch({ query, params: { surface, gender: gender ?? '', handle }, revalidate: 3600, tags: [...] })`.
- **Plan 06 (Importer) unblocked for verification:** the importer's `--dry` mode can re-query the seeded docs through this query path.
- **Plan 08 (E2E) unblocked:** once Plan 07 seeds data, the e2e suite can hit each route and the widget will resolve the post via this query.

## Acceptance Criteria Verification

- [x] `grep -q "COLLECTION_SEO_QUERY" src/shared/sanity/lib/query.ts` → exit 0
- [x] `grep -q "translation.metadata" src/shared/sanity/lib/query.ts` → exit 0 (in the new query, not just the pre-existing POST_BY_LANGUAGE_QUERY)
- [x] `npx vitest run tests/unit/collectionSeoQuery.test.ts` → 6 passing tests (0.45s)
- [x] `npx tsc --noEmit` → exit 0

## Self-Check: PASSED

- `src/shared/sanity/lib/query.ts` contains `COLLECTION_SEO_QUERY`: FOUND
- `src/shared/sanity/lib/query.ts` contains `translation.metadata`: FOUND
- `tests/unit/collectionSeoQuery.test.ts`: FOUND (6 real assertions, no `it.todo`)
- Commit `06882002` (RED — failing tests): FOUND in `git log`
- Commit `63626eee` (GREEN — implementation): FOUND in `git log`
- `npx vitest run tests/unit/collectionSeoQuery.test.ts`: 6/6 passing
- `npx tsc --noEmit`: exit 0

---
*Phase: 22-collection-seo-content-sanity-migration*
*Completed: 2026-05-22*
