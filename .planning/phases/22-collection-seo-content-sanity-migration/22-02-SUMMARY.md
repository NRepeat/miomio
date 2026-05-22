---
phase: 22-collection-seo-content-sanity-migration
plan: 02
subsystem: sanity-schema
tags: [sanity, schema, collectionSeo, typegen, vitest]

requires:
  - phase: 22-collection-seo-content-sanity-migration
    provides: Wave 0 test infrastructure (vitest config + stub tests/unit/collectionSeoSchema.test.ts with it.todo placeholders)
provides:
  - "collectionSeo Sanity document type (composite key: surface + optional gender + collectionHandle)"
  - "Registered collectionSeoType in src/shared/sanity/schemaTypes/index.ts"
  - "Regenerated Sanity extract.json + types.ts (adds CollectionSeo interface so GROQ result typing works)"
  - "Six passing schema unit tests covering shape, options, conditional visibility, and weak reference"
affects: [22-03, 22-04, 22-06, 22-07]

tech-stack:
  added: []
  patterns:
    - "Composite-key Sanity mapping doc — code-driven lookup replacing an in-file Record map"
    - "Weak reference (+ implicit _strengthenOnPublish on import) to point a mapping doc at a translated post; locale resolution deferred to GROQ via translation.metadata"

key-files:
  created:
    - src/shared/sanity/schemaTypes/collectionSeoType.ts
  modified:
    - src/shared/sanity/schemaTypes/index.ts
    - src/shared/sanity/types.ts
    - src/shared/sanity/extract.json
    - tests/unit/collectionSeoSchema.test.ts

key-decisions:
  - "Schema lifted verbatim from 22-RESEARCH.md Pattern 1 (lines 150-227) — title, surface (brand|gender), gender (man|woman|kids, conditional), collectionHandle (regex /^[a-z0-9-]+$/), post (weak reference → post)"
  - "Did NOT add an seo field (post owns SEO) and did NOT add a language field (mapping is locale-independent; locale switch happens via translation.metadata at GROQ time)"
  - "Kids retained in gender enum per CONTEXT.md D-01 (reserved for future use; described in field description)"

patterns-established:
  - "Pattern: code-driven Sanity lookup doc — editor fills 3 indexing fields + picks a reference; widget queries by composite key instead of importing a hardcoded map"

requirements-completed: [SCHEMA]

duration: 3min
completed: 2026-05-22
---

# Phase 22 Plan 02: Sanity collectionSeo schema Summary

**New `collectionSeo` Sanity document type with composite-key fields (surface, optional gender, collectionHandle) + weak reference to `post`, registered in the schema index with regenerated TypeScript types — the data backbone for Plans 03/04/06/07.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-22T09:22:30Z
- **Completed:** 2026-05-22T09:25:26Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added `src/shared/sanity/schemaTypes/collectionSeoType.ts` with all 5 fields (title, surface, gender, collectionHandle, post) — verbatim from RESEARCH Pattern 1
- Registered `collectionSeoType` in `src/shared/sanity/schemaTypes/index.ts` (single import + single array entry, no reordering)
- Ran `npm run typegen` — `src/shared/sanity/types.ts` and `extract.json` now contain `CollectionSeo` so downstream GROQ result typing works in Plan 03
- Replaced the Plan-01 `it.todo` stub in `tests/unit/collectionSeoSchema.test.ts` with 6 passing assertions (shape, required fields, surface options, conditional gender visibility, weak post reference, index registration)

## Task Commits

1. **Task 1: Create collectionSeoType.ts schema file** — `d25b7975` (feat)
2. **Task 2: Register + regenerate types + replace test stub** — `e98eb17e` (feat)

_Plan metadata commit follows below._

## Files Created/Modified

- `src/shared/sanity/schemaTypes/collectionSeoType.ts` — new collectionSeo document type (77 lines)
- `src/shared/sanity/schemaTypes/index.ts` — import + array entry for collectionSeoType
- `src/shared/sanity/types.ts` — regenerated; gained CollectionSeo interface (2 occurrences confirmed)
- `src/shared/sanity/extract.json` — regenerated schema extraction
- `tests/unit/collectionSeoSchema.test.ts` — replaced 7 it.todo stubs with 6 passing assertions

## Decisions Made

- Followed RESEARCH Pattern 1 verbatim — no deviation from the planner's intended schema shape.
- Appended `collectionSeoType` at the end of `schema.types` array to minimize diff and avoid touching existing ordering.

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria met:
- File exists at `src/shared/sanity/schemaTypes/collectionSeoType.ts` ✓
- All 5 fields present with correct shape (weak post reference, conditional gender, handle regex, preview prepare) ✓
- `grep -q "collectionSeoType" src/shared/sanity/schemaTypes/index.ts` exits 0 ✓
- `grep "CollectionSeo" src/shared/sanity/types.ts` returns 2 occurrences ✓
- `npx vitest run tests/unit/collectionSeoSchema.test.ts` — 6 / 6 passed in 2.45s ✓
- `npx tsc --noEmit` clean (exit 0) ✓

## Issues Encountered

None. `npm run typegen` worked first try; vitest test file resolves `@shared/sanity/schemaTypes/collectionSeoType` via the existing vitest.config.ts alias from Plan 01.

## User Setup Required

None — schema is purely code; the new `collectionSeo` doc type appears in Sanity Studio automatically after the next dev/build cycle. Editors can begin creating mapping docs once Plan 03 wires the GROQ query, but that's optional for this plan's success criteria.

## Next Phase Readiness

- **Plan 03 (COLLECTION_SEO_QUERY GROQ)** — unblocked. The `CollectionSeo` interface in `types.ts` and the schema field shape are the only prerequisites; both are in place.
- **Plan 04 (widget refactor)** — unblocked (depends on Plan 03, which is unblocked here).
- **Plan 06 (importer)** — unblocked. The importer's `buildCollectionSeo` helper has a valid target doc type to upsert.
- **Plan 07 (live import + --migrate-legacy)** — unblocked transitively.

No blockers carried forward.

## Self-Check: PASSED

Files exist:
- FOUND: src/shared/sanity/schemaTypes/collectionSeoType.ts
- FOUND: src/shared/sanity/schemaTypes/index.ts (modified)
- FOUND: src/shared/sanity/types.ts (modified, contains CollectionSeo)
- FOUND: src/shared/sanity/extract.json (modified)
- FOUND: tests/unit/collectionSeoSchema.test.ts (modified)

Commits exist:
- FOUND: d25b7975 (feat(22-02): add collectionSeo Sanity document type)
- FOUND: e98eb17e (feat(22-02): register collectionSeoType + regenerate Sanity types + schema tests)

---
*Phase: 22-collection-seo-content-sanity-migration*
*Completed: 2026-05-22*
