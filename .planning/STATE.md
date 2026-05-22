---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
stopped_at: Completed 22-06-PLAN.md
last_updated: "2026-05-22T09:32:24.676Z"
progress:
  total_phases: 22
  completed_phases: 12
  total_plans: 53
  completed_plans: 49
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** The checkout-to-order flow works reliably and securely for every user — anonymous or authenticated — without data leaks, silent failures, or broken UI.
**Current focus:** Phase 22 — collection-seo-content-sanity-migration

## Current Position

Phase: 22 (collection-seo-content-sanity-migration) — EXECUTING
Plan: 5 of 8

## Performance Metrics

**Velocity:**

- Total plans completed: 41
- Average duration: 2.8 min
- Total execution time: 1.9 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 15-seo-schema-markup | 1 | 5 min | 5 min |
| 16-seo-image-alt-text | 1 | 15 min | 15 min |
| 17-gender-navigation-architecture | 1 | 10 min | 10 min |

**Recent Trend:**

- Last 5 plans: 14-01 (3 min), 15-01 (5 min), 16-01 (15 min), 17-01 (10 min)
- Trend: Consistent (5 plans in this session)

*Updated after each plan completion*
| Phase 19-search-refactor-fsd-structure-quick-fixes P01 | 3min | 3 tasks | 13 files |
| Phase 20 P01 | 12min | 2 tasks | 9 files |
| Phase 21-search-popup-cmdk-ux-overhaul P01 | 8min | 7 tasks | 11 files |
| Phase 22-collection-seo-content-sanity-migration P01 | 3min | 2 tasks | 9 files |
| Phase 22-collection-seo-content-sanity-migration P02 | 3 | 2 tasks | 5 files |
| Phase 22-collection-seo-content-sanity-migration P03 | 3min | 1 tasks | 2 files |
| Phase 22-collection-seo-content-sanity-migration P05 | 1min | 1 tasks | 1 files |
| Phase 22-collection-seo-content-sanity-migration P04 | 7min | 3 tasks | 3 files |
| Phase 22-collection-seo-content-sanity-migration P06 | 4 min | 3 tasks | 4 files |

## Accumulated Context

### Roadmap Evolution

- Phase 12 added: SEO Technical Bugs — fix repetitive path 404s, search page noindex, tags outside head
- Phase 13 added: SEO Redirect Architecture — simplify redirect chains to single 301, fix language routing
- Phase 14 added: SEO Meta Data Templates — fix short/long/duplicate titles and missing meta descriptions
- Phase 15 added: SEO Schema Markup — add OnlineStore, WebSite, SearchAction, ItemList, shipping/return schemas
- Phase 16 added: SEO Image Alt Text — add descriptive alt text to all product and content images
- Phase 17 added: Gender Navigation Architecture — derive gender from URL instead of cookie to fix back navigation state bug
- Phase 18 added: SEO audit fixes (canonical, redirects, 404s, image optimization, meta-tags)
- Phase 19 added: Search refactor — FSD structure + quick fixes (popup discount/layout, mobile header, single GraphQL source)
- Phase 22 added: Collection SEO content Sanity migration — replace hardcoded COLLECTION_TO_POST_SLUG with Sanity-driven mapping, extend widget to brand pages, import 7 new UA/RU articles from .md sources

### Decisions

- [Phase 16]: Standardized product alt text format as `{Product Title} {Variant Info}` to balance SEO and readability.
- [Phase 17]: Eliminated 'gender' cookie and moved to URL-derived state via segments and x-gender header.
- [Phase 17]: Removed dead components GenderProvider and SetGenderCookie that relied on cookie state.
- [Phase 17]: Refactored all header/navigation components to use headers() for gender state, ensuring consistency during back-navigation.
- [Phase 17]: Updated ProductView to use headers() and URL-based collection handles for breadcrumbs, maintaining context without cookies.
- [Phase 19-search-refactor-fsd-structure-quick-fixes]: ProductCardSPP wraps internally with Link; SearchResultsGrid uses outer div + onClick to avoid nested anchors while still closing popup
- [Phase 19-search-refactor-fsd-structure-quick-fixes]: /search page now passes locale to predictiveSearch; RU users on /ru/search get RU-localized results (popup parity)
- [Phase 19-search-refactor-fsd-structure-quick-fixes]: Unified grid breakpoints: grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 (page's denser set adopted as default)
- [Phase 20]: /search uses two-call filter-defs pattern from getCollection.ts; skip when only q/sort/limit present
- [Phase 20]: Search results page reuses collection FilterSheet/SortSelect/ActiveFiltersCarousel/ClientGrid/LoadMore without forking; LoadMore handle prop receives query string
- [Phase 20]: SearchSortKeys lacks CREATED; created-desc silently degrades to RELEVANCE rather than forking SortSelect
- [Phase 21-search-popup-cmdk-ux-overhaul]: Extended shadcn CommandDialog to forward shouldFilter/filter/loop, avoiding Dialog+Command fallback (R-05)
- [Phase 21-search-popup-cmdk-ux-overhaul]: Recent searches stored under nnshop:search:recent (max 5, FIFO, case-insensitive dedupe), populated via useEffect for SSR safety
- [Phase 22-collection-seo-content-sanity-migration]: vitest.config.ts test.include glob spans both tests/unit/** and src/**/*.test.{ts,tsx} so legacy suite and Wave 0 stubs coexist
- [Phase 22-collection-seo-content-sanity-migration]: Playwright spec discoverability requires per-spec project entry; added 'collection-seo' project for tests/e2e/collection-seo.spec.ts
- [Phase 22-collection-seo-content-sanity-migration]: collectionSeo doc type lifted verbatim from RESEARCH Pattern 1: composite key (surface + optional gender + collectionHandle), weak reference to post, no language field (locale handled at GROQ via translation.metadata), no seo field (post owns SEO)
- [Phase 22-collection-seo-content-sanity-migration]: COLLECTION_SEO_QUERY single composite query (not split brand/gender) with short-circuit on $surface=='brand'; caller must pass gender='' never undefined
- [Phase 22-collection-seo-content-sanity-migration]: Brand page renders CollectionSeoContent after BrandGrid Suspense, inside container, with surface="brand" — matches D-04/D-05/D-06
- [Phase 22-collection-seo-content-sanity-migration]: CollectionSeoContent widget now consumes COLLECTION_SEO_QUERY (Sanity GROQ) — hardcoded COLLECTION_TO_POST_SLUG map deleted; widget prop shape generalized to { surface, gender?, handle, locale }
- [Phase 22-collection-seo-content-sanity-migration]: import-seo-md.mjs copies helpers verbatim from import-seo-blog.mjs rather than extracting a shared module — CONTEXT D-07 mandates the two importers coexist
- [Phase 22-collection-seo-content-sanity-migration]: ESM CLI guard (import.meta.url === file://argv[1]) lets the importer expose MANIFEST/LEGACY_MIGRATION/buildCollectionSeo to vitest without triggering main()
- [Phase 22-collection-seo-content-sanity-migration]: --clean-old targets both imported-seo-md-* and imported-collection-seo-* docs so one flag resets the importer's full footprint

## Session Continuity

Last session: 2026-05-22T09:32:16.692Z
Stopped at: Completed 22-06-PLAN.md
Resume file: None
