# Visibility Marketplace — Project Context

_Last updated: 2026-08-24_

## 1. Product Summary

Visibility Marketplace is a lightweight public discovery and visibility marketplace for YouTube channels, Facebook/Instagram profiles, apps, websites, startups, and future listing types.

Visitors browse/search/filter listings. Listing owners and ordinary visitors/supporters can financially support a listing through **Push Up**. Valid paid pushes increase visibility/ranking on the active public board.

Paid ranking must always be clearly disclosed and must never be presented as organic popularity.

Current working repo/product name: `visibilitymarketplace`. Final public brand/domain can change later, so branding stays configurable.

## 2. Account / Role Model

There is one normal **Sign in** flow. Users do not choose a role at signup.

```text
Visitor
  ↓ signs up
Supporter
  ↓ creates/submits first listing
Publisher
```

Roles:
- `supporter` — default registered user
- `publisher` — supporter who has created/submitted at least one listing
- `admin` — trusted role assigned securely, never self-selected

A publisher can still support other listings. No separate supporter/publisher accounts are needed.

Admin capabilities will include moderation, publish/reject/suspend actions, and operational/payment review. Admin authorization must eventually use trusted server-side logic/custom claims rather than client-controlled role data.

## 3. Ranking / Push Up Model

The marketplace uses time-bounded boards, currently a **weekly board**.

Paid support can come from:
- listing owner
- fans
- visitors/supporters

Support is cumulative within the active board period. Higher valid paid support can move a listing higher.

Rules:
- paid ranking is disclosed
- payment success is server-authoritative
- browser code never marks a boost as paid
- boost totals/ranking come from trusted backend operations
- ranking must avoid expensive full-collection scans

Current UI terms/config placeholders:
- action: `Push Up`
- board: `Weekly board`
- `100% FREE`
- `$1 Board Visibility`

Pricing is not fully locked and must remain config-driven.

## 4. Firestore Cost Rule — NON-NEGOTIABLE

Firestore cost efficiency is a design constraint for every feature.

Every new schema/query must be evaluated for read/write/delete cost before implementation.

Rules:
- never load entire large collections and filter in the browser
- use indexed queries, limits, and pagination
- avoid N+1 reads
- avoid repeated reads of stable config
- avoid real-time listeners unless truly needed
- do not store ordinary page impressions in Firestore
- use Google Analytics for general traffic/page analytics
- maintain denormalized/aggregate counters when repeated counting is expensive
- batch/transaction related writes where appropriate
- avoid raw event documents unless the event history is actually valuable
- prefer lifecycle status over destructive delete where history matters

Do not repeatedly scan collections to calculate:
- published listing count
- new today count
- pushed total
- supporter count
- board rank

Stable categories/listing types currently remain local config, intentionally costing zero Firestore reads on normal page loads.

## 5. Recommended Board Architecture

Permanent listing data and board-period ranking data should eventually be separated:

```text
listings/{listingId}
  permanent listing information

boardPeriods/{periodId}
  board metadata
  aggregate board statistics

boardPeriods/{periodId}/entries/{listingId}
  rank
  boostTotalMinor
  supporterCount
```

Benefits:
- weekly resets do not rewrite permanent listing docs
- historical boards remain available
- ranking state is scoped correctly
- aggregates can be updated efficiently

The current prototype still stores some board values on `Listing`; migrate when implementing the real boost system.

## 6. Technology / Repository

Frontend:
- React
- TypeScript
- Vite
- React Router installed
- Lucide React icons

Backend/platform:
- Firebase project: `visibilitymarketplace`
- Firebase Authentication
- Cloud Firestore
- Firebase Analytics
- Firebase Hosting planned
- trusted Cloud Functions/server backend planned for payments and secure writes

Repository:

```text
GitHub: rkmoneanddone/visibilitymarketplace
Branch: main
Local: E:\projects\VisibilityMarketplace
```

## 7. Firebase Setup

Firebase Web App is registered.

Firebase config is loaded through Vite environment variables, not hardcoded in source:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

`.env` is Git-ignored.

`src/config/firebase.ts` initializes:
- Firebase App
- Firebase Auth
- Firestore
- Analytics when supported

Firestore location:

```text
asia-south1 — Mumbai
```

## 8. Firestore Security Position

Initial rules are deliberately restrictive.

Principles:
- public published-listing/board reads may be allowed
- browser writes remain blocked until ownership/Auth rules are ready
- boost/payment writes are never trusted directly from browser
- user-profile permissions are added with Auth
- trusted boost/payment changes use Admin SDK/Cloud Functions/server logic

Never weaken production rules merely to make a local script work.

## 9. Firebase Admin / Seed Tooling

Local seeding uses `firebase-admin`.

Local private key:

```text
secrets/firebase-admin-key.json
```

`secrets/` must stay Git-ignored. Never paste or commit this key.

Seed script:

```text
scripts/seed-firestore.cjs
```

Successfully seeded:

```text
boardPeriods/weekly-2026-08-24
listings/finance-with-abc
```

The Admin SDK write path has been verified.

## 10. Firestore Read Services

Firestore access is separated from page/UI code.

```text
src/services/firestore/listings.ts
src/services/firestore/boardPeriods.ts
```

Verified functions:
- `getPublishedListings()`
- `getActiveBoardPeriod()`

Browser read verification succeeded for:
- published `Finance With ABC`
- active board `weekly-2026-08-24`

Composite indexes used:

```text
listings:
status                   Ascending
currentBoostTotalMinor   Descending

boardPeriods:
status      Ascending
startsAt    Descending
```

## 11. Listing Data Model

Current lifecycle:

```text
draft
payment_pending
submitted
under_review
published
rejected
suspended
expired
archived
```

Current listing concepts include:
- ownerId
- listingTypeId
- categoryId/subcategoryId
- title/slug
- handle/ownerDisplayName
- shortDescription/description
- externalUrl/thumbnailUrl
- country/language
- status
- externalClicks
- currentBoostTotalMinor
- currentBoardRank
- timestamps

Money is stored in **minor units**.

```text
4600 = $46.00
```

Never use floating-point major-unit values as authoritative money storage.

## 12. Boost Model

Current boost concepts:

```text
source: owner | visitor
status: pending | paid | failed | refunded
```

Boost documents conceptually include listing ID, board period ID, optional supporter user ID, source, amountMinor, currency, payment ID, status, and timestamp.

Only server-verified `paid` boosts may affect totals/rank.

## 13. Homepage Status

The main board is now Firestore-driven.

Current behavior:
- published listings load from Firestore
- loading/error/empty states exist
- listing-type filtering works against loaded Firestore results
- IDs map to configured display names
- boost total is formatted from minor units
- Visit is a real external link
- currentBoardRank is used where present
- supporter count currently displays `0` intentionally until a real supporter-count architecture exists

Do not invent/fake supporter counts.

Still temporary/demo:
- New Today card data
- some board stats/aggregates

These must be replaced with efficient indexed queries or maintained aggregate fields.

## 14. Shared Code Organization Rule

Reusable logic must not accumulate in pages.

```text
src/config/      business/configuration
src/services/    Firebase/API/data access
src/lib/         pure reusable helpers/business utilities
src/components/  reusable UI
src/pages/       route/page composition
src/types/       shared TypeScript models
```

Current helpers:

```text
src/lib/marketplace/listing.ts
src/lib/marketplace/money.ts
src/lib/marketplace/icons.tsx
```

Examples:
- `getListingTypeName()`
- `getCategoryName()`
- `getSubcategoryName()`
- `getTypeIcon()`
- `minorToMajor()`
- `formatMoneyMinor()`

Keep page-only components local until genuinely reused; avoid premature component fragmentation.

## 15. Config-Driven Product Rules

Current config files:

```text
src/config/site.ts
src/config/marketplace.ts
src/config/listingTypes.ts
src/config/categories.ts
```

Keep business-level settings configurable:
- site display name
- currency
- board period label
- free listing label
- board visibility label/price
- Push Up terminology
- homepage copy
- listing-type fees
- free listing allowances
- minimum boost values
- enabled state/sort order

Do not turn every static UI label into a CMS.

## 16. Listing Types / Categories

Current listing types:
- YouTube
- Facebook
- Instagram
- App
- Startup
- Website
- Other

Current category areas include:
- Technology
- Finance
- Education
- Entertainment
- Gaming
- Business
- Lifestyle
- Other

Subcategories are filters, not separate physical page structures. Individual listing detail pages will exist.

## 17. UI / UX Rules

UI should remain:
- ultra-lightweight
- mobile-first
- clear and simple
- white/off-white base
- pastel cards where useful
- blue primary actions
- no gradients
- no heavy decorative shapes
- no image-heavy homepage

Desktop target:

```text
10% outer margin
60% main board
20% sidebar
10% outer margin
```

Listing rows should show compactly:
- rank
- listing marker/type
- title
- type/category/subcategory
- handle/owner when useful
- description
- push amount
- real supporter count when available
- Visit
- Push Up

Mobile priorities:
- readable category/type metadata
- compact amount/supporters/Visit/Push Up row
- minimal padding
- readable fonts without heavy bold weight

Sidebar remains on desktop. Current cards:
- Get More Visibility — blue pastel
- New Today — green pastel
- How It Works — purple pastel
- This Board — cream/yellow pastel, placed after the primary sidebar cards

## 18. Analytics Strategy

Google Analytics handles normal traffic:
- page views
- visits
- acquisition
- device
- country

Firestore/internal analytics are only for business-critical data:
- external clicks when needed
- boosts
- supporters
- payments
- ranking/history

Do not write Firestore events for every page impression.

## 19. Authentication Plan

Firebase Auth is selected.

Initial providers planned:
- Google
- Email/Password

There is one Sign in flow.

Default registered role:

```text
supporter
```

On first listing creation/submission, the user gains publisher capability / becomes `publisher`.

Admin is assigned separately through trusted logic.

Auth should be completed before the real Add Listing workflow because ownership depends on authenticated UID.

## 20. Add Listing — Planned

Expected fields:
- listing type
- category
- subcategory
- title
- handle where applicable
- short description
- description if needed
- external URL
- optional image/logo later
- country/language when useful

Submission creates a user-owned draft/submitted listing. First listing transitions the account from supporter to publisher capability. Admin moderation moves listings to published/rejected/etc.

## 21. Individual Listing Pages — Planned

Expected route:

```text
/listing/:slug
```

Expected content:
- title
- type/category
- description
- external link
- board rank
- pushed amount
- supporter count
- Push Up
- SEO metadata

## 22. Search / Filters — Planned

UI currently has listing type, category, subcategory, and search controls.

Production implementation must be Firestore-cost-conscious:
- indexed queries
- limits
- pagination
- subcategory dependent on selected category
- no full-collection client-side filtering at scale

## 23. New Today / Board Stats — Planned

`New Today` is still demo-backed. Replace it with a small indexed recent-published query.

Production board stats should be aggregate-driven:
- listed count
- new today
- pushed total

Do not scan full collections on every homepage load. Prefer board-period aggregates updated by trusted backend transactions.

## 24. Payment System — Planned

Gateway not yet selected.

Requirements:
- India merchant support
- international/USD readiness
- economical for small transactions
- guest support if feasible
- server-side verification
- webhooks
- refunds
- reliable transaction IDs

Selection must consider real India merchant/payment economics, not only SDK convenience.

## 25. SEO

Public pages eventually need:
- title/meta description
- canonical URLs
- Open Graph/social metadata
- semantic headings
- structured data
- sitemap
- robots.txt
- clean URLs
- listing-specific SEO
- useful explanatory content

Plain Vite React is not ideal for large public SEO surface. Decide SSR/prerender strategy before public page count grows significantly.

Subcategories remain filters rather than generating thin physical pages.

## 26. Hosting

Firebase Hosting is planned. Final public domain can be connected later. Firebase project ID does not need to match final brand/domain.

## 27. Git Workflow

Repository:

```text
https://github.com/rkmoneanddone/visibilitymarketplace
```

Branch:

```text
main
```

Known milestones include:

```text
7206182 Initialize Visibility Marketplace React app
4247f20 Add configurable marketplace data foundation
65de4d6 Build configurable responsive marketplace homepage
```

Before commits:

```powershell
npx tsc --noEmit
git status
```

Never commit:
- `.env`
- service-account JSON
- `secrets/`
- private credentials

## 28. Current Status

Completed/verified:
- React/Vite/TypeScript foundation
- responsive marketplace homepage
- configurable site/marketplace/listing/category foundation
- mobile-first UI cleanup
- GitHub repo connected
- Firebase project created
- Firestore in Mumbai
- Firebase Auth SDK initialized
- Firestore SDK initialized
- Analytics initialization available
- restrictive Firestore rules
- Admin SDK seed tooling works
- test active weekly board seeded
- test published listing seeded
- required composite indexes created
- browser Firestore reads verified
- homepage main board connected to Firestore
- reusable marketplace helpers moved to `src/lib/marketplace`

Current next milestone:

**Authentication + user profile + role handling** using supporter → publisher progression and secure admin assignment.

## 29. Near-Term Development Order

1. Firebase Authentication UI/service
2. user profile model
3. secure role handling
4. supporter session state
5. publisher capability after first listing submission
6. Add Listing flow
7. publisher-owned listing management
8. admin moderation
9. real New Today query
10. cost-efficient board aggregates
11. real supporter-count architecture
12. board-period entries / weekly reset architecture
13. listing detail pages
14. real filtering/search queries
15. Push Up payment workflow
16. trusted payment verification + boost writes
17. external-click aggregation
18. SEO/prerender/SSR decision
19. Firebase Hosting/final domain
20. production hardening: App Check, rule tests, rate limits

## 30. Deferred / Out of V1

Do not expand V1 unnecessarily.

Deferred:
- agent-lead marketplace / ViewBid Leads
- unrelated advertising marketplace extensions unless deliberately added later
- CMS-like configuration of every UI string
- heavy raw analytics storage in Firestore
- image-heavy social-network features

V1 objective: a fast, understandable marketplace where listings can be discovered and transparently supported to move higher on a public visibility board.
