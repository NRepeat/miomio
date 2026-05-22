# Roadmap: nnshop Pre-Launch Hardening

## Overview

This milestone remediates all documented bugs, security issues, reliability gaps, and code quality problems identified in the CONCERNS.md audit before the shop goes live. Work proceeds from highest-risk (security and data leaks) through core flow reliability, visible user-facing bugs, code correctness, and finally production observability and scaling.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Security** - Stop data leaks and close attack surface before the shop goes live (completed 2026-02-23)
- [x] **Phase 2: Core Flow Reliability** - Make cart merge, order creation, and account linking bulletproof (completed 2026-02-23)
- [ ] **Phase 3: Visible Bug Fixes** - Eliminate the remaining user-facing defects
- [ ] **Phase 4: Code Quality** - Remove unsafe type casts and fix memory leaks
- [ ] **Phase 5: Observability & Scaling** - Add production error tracking and remove hardcoded limits
- [ ] **Phase 7: Lighthouse Audit Fixes** - Resolve SEO, accessibility, and quality issues surfaced by Lighthouse audit
- [x] **Phase 15: SEO Schema Markup** - add OnlineStore WebSite SearchAction ItemList shipping and return policy schemas (completed 2026-03-21)
- [x] **Phase 16: SEO Image Alt Text** - add descriptive alt text to all product and content images (completed 2026-03-21)
- [ ] **Phase 17: Gender navigation architecture** - derive gender from URL instead of cookie to fix back navigation state bug

## Phase Details

### Phase 1: Security
**Goal**: No PII is logged, user-supplied HTML is sanitized, and CSRF protection is verified active
**Depends on**: Nothing (first phase)
**Requirements**: BUG-03, SEC-01, SEC-02
**Success Criteria** (what must be TRUE):
  1. No user IDs, emails, or cart tokens appear in server logs or browser console in production builds
  2. Product descriptions rendered via dangerouslySetInnerHTML are visibly sanitized by DOMPurify before rendering (verified by injecting a test XSS payload into a Shopify product description)
  3. CSRF protection on all Server Actions is verified active and documented in code comments; a cross-origin POST to a Server Action is rejected
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md — Remove PII console.log from auth, cart, and order files (BUG-03)
- [ ] 01-02-PLAN.md — Install DOMPurify and sanitize product HTML; verify CSRF protection (SEC-01, SEC-02)

### Phase 2: Core Flow Reliability
**Goal**: The cart merge, checkout, and order creation flows handle partial failures without data loss or orphaned state
**Depends on**: Phase 1
**Requirements**: BUG-05, RELY-01, RELY-02, RELY-03, PERF-02
**Success Criteria** (what must be TRUE):
  1. A user who adds items and immediately checks out does not land on a broken or empty cart page
  2. If Shopify cart merge fails mid-flow, the database is not left in an inconsistent state; the error is logged with the step that failed
  3. If order creation succeeds in Shopify but email delivery fails, the order is still saved in the database and the user sees a success state (not an error)
  4. Cart merge makes exactly one Shopify API call for cart data; no duplicate fetches visible in logs during login
  5. Account linking results are accessed by name, not index, and database updates are wrapped in a transaction
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — Harden cart merge with Prisma transaction, retry+rollback, step logging, single Shopify fetch (RELY-01, PERF-02)
- [ ] 02-02-PLAN.md — Fix null-safe cart.delivery access and isolate DB save failure from Shopify order success (BUG-05, RELY-02)
- [x] 02-03-PLAN.md — Fix Promise.allSettled result handling and re-throw Prisma errors in account linking (RELY-03)

### Phase 3: Visible Bug Fixes
**Goal**: All user-facing defects are resolved — favorites persist, quick-buy orders the right variant, and the announcement bar uses a real phone number
**Depends on**: Phase 2
**Requirements**: BUG-01, BUG-02, BUG-04
**Success Criteria** (what must be TRUE):
  1. A logged-in user can add a product to favorites, close the browser, reopen, and see the favorite still selected
  2. A user can remove a favorite and it stays removed after page reload
  3. A user on the quick-buy modal can select a specific variant (size/color), add to cart, and the cart contains that exact variant — not the first one
  4. The Viber link in the announcement bar opens a real phone number from Sanity or environment config, not a placeholder
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Fix FavSession error paths: add toast on DB error and exception (BUG-01)
- [ ] 03-02-PLAN.md — Add viberPhone to Sanity schema + GROQ + announcement bar component (BUG-02)
- [ ] 03-03-PLAN.md — Wire variant selection in ProductQuickView + create useCartUIStore for post-add cart open (BUG-04)

### Phase 4: Code Quality
**Goal**: All unsafe type casts and memory leaks are eliminated; the codebase compiles cleanly with proper types
**Depends on**: Phase 3
**Requirements**: TYPE-01, TYPE-02, TYPE-03, MEM-01, MEM-02
**Success Criteria** (what must be TRUE):
  1. No `as any` casts exist in UkrPoshtaForm, HeroPageBuilder, or AnnouncementBar; TypeScript strict mode produces no new errors in those files
  2. Cart buyer identity and session extension code uses named typed interfaces; no `Record<string, any>` in those paths
  3. Promise.allSettled results in auth.ts are destructured by name, not array index
  4. Every component that calls addEventListener also calls removeEventListener in its useEffect cleanup; verified by code review
  5. NovaPoshtaButton, QuickBuyModal, LanguageSwitcher, and SyncedCarousels store setTimeout IDs in refs and clear them on unmount
**Plans**: 5 plans

Plans:
- [ ] 04-01-PLAN.md — Replace as-any in UkrPoshtaForm (typed form context) and AnnouncementBar (string narrowing) (TYPE-01)
- [ ] 04-02-PLAN.md — Replace as-any in HeroPageBuilder with Sanity type assertions; narrow HeroSwiper props (TYPE-01)
- [ ] 04-03-PLAN.md — Replace Record&lt;string, any&gt; in cart buyer identity update with inline interfaces; verify TYPE-03 and MEM-01 already satisfied (TYPE-02, TYPE-03, MEM-01)
- [ ] 04-04-PLAN.md — Add setTimeout refs with clearTimeout cleanup to NovaPoshtaButton, QuickBuyModal, LanguageSwitcher, SyncedCarousels (MEM-02)
- [ ] 04-05-PLAN.md — Full build verification and human-verify checkpoint (TYPE-01, TYPE-02, TYPE-03, MEM-01, MEM-02)

### Phase 5: Observability & Scaling
**Goal**: Sentry captures unhandled errors in production, filter fetching is conditional, and hardcoded pagination limits are gone
**Depends on**: Phase 4
**Requirements**: OBS-01, PERF-01, SCALE-01, SCALE-02
**Success Criteria** (what must be TRUE):
  1. An unhandled runtime error in any route triggers a Sentry event with context (user session type, route) visible in the Sentry dashboard
  2. Source maps are uploaded on deploy; Sentry error stack traces point to original source lines, not minified output
  3. Collection pages with no active filter UI do not trigger a Shopify filter data request (verified by network inspection)
  4. Shopify GraphQL queries no longer contain hardcoded `first: 250` or `first: 10`; limits are derived from actual data needs
  5. `getCollectionHandles` does not load all handles into memory at once for collections above a defined threshold
**Plans**: TBD

### Phase 6: Pre-Launch UI Polish
**Goal**: Complete the visible UI gaps before launch — favicon, currency display as "грн", CMS-managed footer (social links, hours, address, payment icons), and language switcher cleanup
**Depends on**: Phase 4 (can run parallel with Phase 5)
**Requirements**: UI-01, UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. Browser tab shows a branded favicon icon (not the browser default)
  2. All price displays show amounts in "грн" format (e.g., "1 234 грн"), not "₴"
  3. Footer renders CMS-managed social links, work hours, address, and payment method badges when configured in Sanity Studio; falls back gracefully when fields are empty
  4. Language switcher button has no invisible/dead CSS hover classes; visual behavior is intentional
**Plans**: 3 plans

Plans:
- [ ] 06-01-PLAN.md — Add favicon (app/icon.tsx) and currency utility (₴ → грн across 11 files) (UI-01, UI-02)
- [ ] 06-02-PLAN.md — Expand footerSettings schema, register in siteSettings, add FOOTER_QUERY, update Footer component (UI-03)
- [ ] 06-03-PLAN.md — Language switcher button cleanup + build verification gate (UI-04)

### Phase 7: Lighthouse Audit Fixes
**Goal**: All Lighthouse-identified SEO, accessibility, and quality issues resolved — meta descriptions on product/collection pages, accessible interactive elements, valid HTML structure, hydration error eliminated, product hero image loads with priority
**Depends on**: Phase 4 (can run parallel with Phase 5)
**Requirements**: SEO-01, A11Y-01, A11Y-02, A11Y-03, QUAL-01, QUAL-02
**Success Criteria** (what must be TRUE):
  1. Product pages and collection pages render a unique `<meta name="description">` tag visible in page source
  2. Hamburger menu button and icon-only social/navigation links have `aria-label` attributes (verified by Lighthouse accessibility audit)
  3. Footer copyright text contrast ratio ≥ 4.5:1 (updated color passes WCAG AA)
  4. All `<li>` elements reside inside valid `<ul>/<ol>` parents; heading levels on product page follow sequential order
  5. No browser errors logged during normal product page load (React hydration error #419 eliminated)
  6. Product page LCP element has `priority` prop; LCP improves from 6.6s baseline
**Plans**: 3 plans

Plans:
- [ ] 07-01-PLAN.md — SEO meta description fallbacks + Gallery hydration fix + LCP priority prop (SEO-01, QUAL-01, QUAL-02)
- [ ] 07-02-PLAN.md — aria-label on Telegram/Viber links + footer copyright contrast fix (A11Y-01, A11Y-02)
- [ ] 07-03-PLAN.md — Accordion heading fix + navigation ul/li fix + build verification gate (A11Y-03)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security | 2/2 | Complete   | 2026-02-23 |
| 2. Core Flow Reliability | 3/3 | Complete   | 2026-02-23 |
| 3. Visible Bug Fixes | 1/3 | In Progress|  |
| 4. Code Quality | 2/5 | In Progress|  |
| 5. Observability & Scaling | 0/TBD | Not started | - |
| 6. Pre-Launch UI Polish | 3/3 | Complete   | 2026-02-26 |
| 7. Lighthouse Audit Fixes | 3/3 | Complete   | 2026-02-26 |
| 8. Recently Viewed & Newsletter | 3/4 | In Progress | |
| 9. Frontend Polish | 5/6 | In Progress | |
| 10. SEO Metadata Templates | 2/2 | Complete   | 2026-03-21 |
| 11. PostHog & Prod Prep | 5/5 | Complete   | 2026-03-21 |
| 12. SEO Technical Bugs | 2/2 | Complete   | 2026-03-21 |
| 13. SEO Redirect Architecture | 2/2 | Complete   | 2026-03-21 |
| 14. SEO Metadata Templates | 1/1 | Complete   | 2026-03-21 |
| 15. SEO Schema Markup | 1/1 | Complete   | 2026-03-21 |
| 16. SEO Image Alt Text | 1/1 | Complete   | 2026-03-21 |

### Phase 8: Recently Viewed Products section and Newsletter subscription section

**Goal:** Session-aware recently viewed products carousel on home page and product detail pages, plus a newsletter subscription section on the home page with DB persistence
**Requirements**: TBD
**Depends on:** Phase 7
**Plans:** 3/4 plans executed

Plans:
- [ ] 08-01-PLAN.md — DB schema (NewsletterSubscriber migration), server actions (recordProductView, getProductsByHandles, subscribeToNewsletter), Zod schema, i18n keys
- [ ] 08-02-PLAN.md — Recently Viewed UI (ViewTracker, RecentlyViewedSection) + product page integration
- [ ] 08-03-PLAN.md — Newsletter UI (NewsletterForm, NewsletterSection) + home page integration + anonymous merge patch
- [ ] 08-04-PLAN.md — Build verification + human-verify checkpoint

### Phase 9: ФРОНТ
убрать доставку из чекаута
проверить виджет НП геолокация
в личном кабинете при статусе "Оброблено" плашечку оброблено в зеленый, Скасовано, Відмова від отримання - в червоний
обновления статуса "Отменен"
при добавлении товара в корзину отображать корзину
швидке замовлення - добавить код страны по умолчанию
линковка релейтед продактс - одинаковый sku
применение дисконта к заказу
телефон сменить на 097 217 92 92 + добавить значок вайбера
меню навигации
логотип брендов GHOUD AGL

тест "стежити за ціною"

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 8
**Plans:** 5/6 plans executed

Plans:
- [ ] TBD (run /gsd:plan-phase 9 to break down)

### Phase 10: SEO fixes — update meta title and description to commercial template, test Shopify handles, fix errors

**Goal:** Commercial SEO templates applied to product, collection, and brand pages; old miomio.com.ua product handles audited against Shopify store
**Requirements**: SEO-10-01, SEO-10-02
**Depends on:** Phase 9
**Plans:** 2/2 plans complete

Plans:
- [ ] 10-01-PLAN.md — Update generateMetadata.ts (product/collection/brand templates) + brand page integration
- [ ] 10-02-PLAN.md — Write handle audit script (scripts/test-handles.mjs) + human checkpoint to review missing handles

### Phase 11: Analyze project and prepare for production — integrate PostHog monitoring

**Goal:** Production-ready codebase with clean console logs, fixed robots.txt, renamed NEXT_PUBLIC_SANITY_REVALIDATE_SECRET, PostHog analytics integrated (pageview + checkout funnel + user identify), and security headers on all responses
**Requirements**: PROD-11-01, PROD-11-02, PROD-11-03, PROD-11-04, PROD-11-05
**Depends on:** Phase 10
**Plans:** 5/5 plans complete

Plans:
- [ ] 11-01-PLAN.md — Fix robots.ts (allow crawlers), rename NEXT_PUBLIC_NEXT_PUBLIC_SANITY_REVALIDATE_SECRET, remove noindex from layout
- [ ] 11-02-PLAN.md — Remove console.log/debug logs from ~20 production files
- [ ] 11-03-PLAN.md — Install posthog-js, create PostHogProvider + PostHogPageView + usePostHogIdentify, wire into app
- [ ] 11-04-PLAN.md — Add checkout funnel events (product_viewed, add_to_cart, remove_from_cart, checkout_started, payment_initiated, order_placed)
- [ ] 11-05-PLAN.md — Add security headers to next.config.ts + create .env.example + build verification checkpoint

### Phase 12: SEO Technical Bugs: fix repetitive path 404s, search page noindex, and tags outside head

**Goal:** Repetitive path URLs return 404, search pages are noindexed, and title/canonical tags appear inside head on all pages
**Requirements**: SEO-12-01, SEO-12-02, SEO-12-03, SEO-12-04
**Depends on:** Phase 11
**Plans:** 2/2 plans complete

Plans:
- [x] 12-01-PLAN.md — Remove repetitive path redirect from proxy, add notFound() guard in CollectionPage, add noindex to search page, fix robots.ts
- [x] 12-02-PLAN.md — Add htmlLimitedBots to next.config.ts, move DraftModeTools Suspense inside body in layout.tsx

### Phase 13: SEO Redirect Architecture: simplify redirect chains to single 301 and fix language routing (completed 2026-03-21)

**Goal**: Domain variants resolve to canonical HTTPS/WWW and locale roots resolve correctly in a single 301 hop.
**Depends on**: Phase 12
**Requirements**: SEO-13-01, SEO-13-02, SEO-13-03
**Success Criteria** (what must be TRUE):
  1. `http://miomio.com.ua` redirects directly to `https://www.miomio.com.ua/uk/woman` (single 301)
  2. `/ru` and `/ru/` redirect to `/ru/woman` (not `/uk/woman`)
  3. No 307 (temporary) redirects exist in the structural routing logic
  4. Unit test suite verifies all 40+ URL variants from the audit in < 5 seconds
**Plans**: 2 plans

Plans:
- [x] 13-01-PLAN.md — Core Single-Hop Infrastructure: Build test suite and refactor proxy.ts to Goal State pattern (SEO-13-01, SEO-13-02, SEO-13-03) (completed 2026-03-21)
- [x] 13-02-PLAN.md — Redirect Consistency & Final Audit: Ensure next.config.ts consistency and verify production headers (SEO-13-01) (completed 2026-03-21)

### Phase 14: SEO Meta Data Templates: fix short long duplicate titles and missing meta descriptions

**Goal:** Standardize SEO metadata (titles 30-60 chars, descriptions >= 70 chars) across Product, Collection, Brand, and Info pages, ensuring unique localization for UK/RU and distinct titles from H1.
**Requirements**: SEO-14-01, SEO-14-02
**Depends on:** Phase 13
**Plans:** 1 plan

Plans:
- [x] 14-01-PLAN.md — Standardize SEO metadata templates and fix info page meta (SEO-14-01, SEO-14-02) (completed 2026-03-21)

### Phase 15: SEO Schema Markup: add OnlineStore WebSite SearchAction ItemList shipping and return policy schemas

**Goal:** Implement advanced SEO schema markups including Organization, WebSite (with SearchAction), ItemList (for category listing awareness), and WebPage (for static pages) to improve rich result eligibility.
**Requirements**: SEO-15-01, SEO-15-02, SEO-15-03, SEO-15-04
**Depends on:** Phase 14
**Plans:** 1 plan

Plans:
- [x] 15-01-PLAN.md — Expand SEO structured data with Organization, WebSite, ItemList, and WebPage schemas (SEO-15-01, SEO-15-02, SEO-15-03, SEO-15-04) (completed 2026-03-21)

### Phase 16: SEO Image Alt Text: add descriptive alt text to all product and content images

**Goal:** Implement descriptive and localized alt text for all product and content images to improve SEO and accessibility.
**Requirements**: SEO-16-01, SEO-16-02, SEO-16-03
**Depends on:** Phase 15
**Plans:** 1 plan

Plans:
- [x] 16-01-PLAN.md — Image Alt implementation across product and content images (SEO-16-01, SEO-16-02, SEO-16-03) (completed 2026-03-21)

### Phase 17: Gender navigation architecture: derive gender from URL instead of cookie to fix back navigation state bug

**Goal:** Eliminate the 'gender' cookie and rely entirely on URL segments for gender state to fix back-navigation UI desync.
**Requirements**: SEO-17-01, SEO-17-02
**Depends on:** Phase 16
**Success Criteria** (what must be TRUE):
  1. Gender is never stored in or read from a cookie; it is derived exclusively from the URL segment (e.g., `/[locale]/[gender]`).
  2. After woman→man navigation, pressing the browser Back button correctly restores the woman content, breadcrumbs, and navigation context.
  3. No multiple H1s appear in the DOM after product→related→Back navigation.
  4. Gender switcher correctly updates the URL without writing a cookie.
**Plans:** 1 plan

Plans:
- [x] 17-01-PLAN.md — Cookie-less gender navigation refactor (SEO-17-01, SEO-17-02)

### Phase 18: SEO audit fixes (canonical, redirects, 404s, image optimization, meta-tags)

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 17
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 18 to break down)

### Phase 19: Search refactor — FSD structure + quick fixes

**Goal:** Restructure search code into FSD module (src/features/search/), fix popup discount price (use ProductCardSPP, znizka metafields plural) and layout consistency between popup/page, make mobile dialog header responsive (icon-only button on small viewport), unify GraphQL into single source. Foundation for follow-up phases B (cmdk UX overhaul) and C (full search page with filters + pagination).
**Requirements**: TBD
**Depends on:** Phase 18
**Plans:** 1/1 plans complete

Plans:
- [x] TBD (run /gsd:plan-phase 19 to break down) (completed 2026-05-02)

### Phase 20: Search page — filters, sort, pagination

**Goal:** Switch /search route from Storefront `predictiveSearch` (capped at 10, no filters) to full `search` query with productFilters facets. Reuse FilterSheet + SortSelect + ActiveFiltersCarousel from collections module so search results page reaches feature parity with collection pages. Add cursor pagination via Load more button.
**Requirements**: TBD
**Depends on:** Phase 19
**Plans:** 1/1 plans complete

Plans:
- [x] TBD (run /gsd:plan-phase 20 to break down) (completed 2026-05-02)

### Phase 21: Search popup — cmdk UX overhaul

**Goal:** Replace SearchDialog framer-motion+plain-input UX with cmdk (Command/CommandDialog) for a docs-site-style command palette: sectioned results (Products / Brands / Recent), arrow-key navigation, recent searches in localStorage (max 5), inline loading shimmer in input, result-count display, ESC/Cmd+K shortcuts.
**Requirements**: TBD
**Depends on:** Phase 19, Phase 20
**Plans:** 1/1 plans complete

Plans:
- [x] TBD (run /gsd:plan-phase 21 to break down) (completed 2026-05-02)

### Phase 22: Collection SEO content Sanity migration

**Goal:** Replace the hardcoded COLLECTION_TO_POST_SLUG map with a Sanity-driven collectionSeo document type; extend the existing collection-SEO widget to brand pages; import 7 new UA/RU SEO articles from .md sources and migrate the 6 existing hardcoded mappings to the new schema.
**Requirements**: TEST-INFRA, SCHEMA, GROQ, WIDGET, BRAND-INTEGRATION, IMPORTER, HANDLE-VERIFY, DATA, E2E (synthetic per VALIDATION.md)
**Depends on:** Phase 21
**Plans:** 4/8 plans executed

Plans:
- [x] 22-01-PLAN.md — Wave 0 test infrastructure scaffolding (vitest.config.ts + 5 test stubs + 2 .md fixtures)
- [x] 22-02-PLAN.md — Sanity collectionSeo schema (collectionSeoType.ts + register + typegen)
- [x] 22-03-PLAN.md — COLLECTION_SEO_QUERY GROQ with translation.metadata join
- [ ] 22-04-PLAN.md — Widget refactor: swap COLLECTION_TO_POST_SLUG for COLLECTION_SEO_QUERY + update gender-collection page
- [x] 22-05-PLAN.md — Brand page integration (add CollectionSeoContent after BrandGrid)
- [ ] 22-06-PLAN.md — scripts/import-seo-md.mjs with MANIFEST + LEGACY_MIGRATION + collectionSeo upsert
- [ ] 22-07-PLAN.md — Live data import (manual handle verification gate + run importer + --migrate-legacy)
- [ ] 22-08-PLAN.md — E2E playwright smoke across 13 routes × 2 locales
