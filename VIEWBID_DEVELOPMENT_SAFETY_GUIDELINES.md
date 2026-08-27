# VIEWBID / VISIBILITY MARKETPLACE â€” DEVELOPMENT SAFETY & CHANGE GUIDELINES

**Status:** Permanent project guideline
**Applies to:** All ChatGPT-assisted development, GitHub changes, Firebase/Firestore work, Cloud Functions, deployments, migrations, payments, ranking logic, and production operations.

## Core Principle

Development must prioritize no accidental data loss, no accidental production outage, no silent destructive change, no direct production write unless explicitly approved, reversible changes where practical, and auditable/idempotent critical financial or ranking operations.

## GitHub Write Policy

ChatGPT may read the repository freely when access is available.

Preferred workflow:

**Read current code â†’ create/update code â†’ validate â†’ commit to development branch â†’ user tests â†’ merge to `main`.**

Default: do not directly modify `main` for substantial changes.

Preferred branches:
- `chatgpt-dev`
- `feature/board-entry`
- `feature/board-push-up`
- `fix/mobile-dialog`

Direct updates to `main` are allowed only for very small low-risk changes, with explicit user approval, after validation.

## Destructive Git Rules

ChatGPT must never intentionally delete the repository.

Without explicit approval for that exact operation, ChatGPT must not:
- delete branches containing unique work;
- delete large groups of files;
- rewrite Git history;
- force-push;
- reset `main`;
- remove production configuration;
- remove Firebase configuration;
- remove payment configuration;
- remove database rules;
- delete required deployment workflows;
- delete secrets or environment configuration.

Commands/actions equivalent to these are prohibited by default:
- `git push --force`
- `git reset --hard`
- `git clean -fd`
- `git branch -D`

## Commit Policy

Before meaningful commits, run:
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`
- `git status`

Commits must not contain credentials, temporary files, service-account JSON, or `.env` secrets.

## Secrets and Credentials

Never commit:
- Firebase service-account JSON
- API private keys
- payment secrets
- OpenAI keys
- Firebase Admin credentials
- OAuth client secrets
- webhook secrets
- database passwords
- secret-bearing `.env` files

Use environment variables, Firebase Secret Manager, GitHub Secrets, or other approved secret stores.

## Firebase / Firestore Safety

Treat production Firestore as critical business data.

Never perform without explicit approval:
- delete Firestore database;
- delete all documents in a collection;
- recursively delete collections;
- bulk-delete users;
- reset production data;
- overwrite production collections;
- change Firebase project;
- change Firestore location;
- remove production security rules;
- deploy rules that broadly allow public writes;
- execute destructive migrations.

Before a destructive operation, state:
1. what will change/delete;
2. whether reversible;
3. what backup exists;
4. affected collections/documents;
5. safer alternative if available.

## Database Migration Rule

Prefer additive schema changes:
- add field;
- add collection;
- add index;
- temporarily support old + new fields;
- backfill safely;
- remove deprecated structure later.

Avoid immediate destructive rewrites, ID changes, or in-place collection restructuring.

Migrations should be restartable/idempotent where practical.

## Backup Rule

Before high-risk migration/bulk change:
- create/export backup where supported;
- record affected collections;
- record migration version/date;
- test against emulator/test data where practical;
- provide dry-run mode for bulk changes where possible.

## Firestore Security Rules

Client-side UI restrictions are not security.

Privileged fields should not be directly writable by untrusted clients, including:
- `role`
- `status = published`
- `boostTotalMinor`
- payment status
- admin approval
- ranking totals

Enforce privileged operations in Firestore rules and/or trusted backend code.

## Critical Write Architecture

Critical writes must be:
- authenticated;
- authorized;
- server-validated;
- atomic where possible;
- idempotent;
- auditable;
- retry-safe.

For financial/ranking writes, never trust browser-supplied authoritative values.

The server should determine/verify:
- amount;
- currency;
- listing;
- board;
- user;
- payment status;
- boost credited;
- timestamp;
- transaction identity.

## Payment Safety

A browser-reported payment success must never directly increase visibility/ranking.

Correct flow:

**Client requests payment â†’ backend creates payment/order â†’ provider processes â†’ backend/webhook verifies â†’ trusted transaction records payment â†’ entitlement/ranking applied exactly once.**

Payment retries must never double-credit.

Store money in integer minor units, e.g. `$5.00 = 500`, `â‚¹99.00 = 9900`.

## Refund Policy

Current product policy:

> Listing visibility, Board entry and Push Up payments are not refunded once successfully processed because service effort, payment processing and infrastructure costs are incurred. This does not limit any refund right required by applicable law.

Communicate this before payment where practical.

## Listing Ranking Rule

Normal marketplace Listings are permanent.

They participate in recurring ranking periods by **Listing Type**.

A new ranking period does not require a new Listing.

Paid ranking must be presented transparently and not as organic popularity.

## Requested Board Rule

A requested Board is:
- separate from normal recurring ranking;
- Admin-approved;
- public after approval;
- tied to exactly one Listing Type;
- time-bounded;
- one-time;
- never reused after ending.

Existing permanent Listings enter through a `BoardEntry`; do not duplicate the Listing itself.

## Board Entry Rule

Board entry:
- references an existing Listing;
- must match Board Listing Type;
- is allowed only during the entry window;
- cannot be duplicated for the same Board + Listing;
- requires successful verified payment if an entry fee applies.

Entry fee grants permission to enter and does **not** affect ranking.

## Board Push Up Rule

Board ranking is based on Board-specific Push Up activity.

Push Up:
- applies to a `BoardEntry`;
- can be made by owners or supporters;
- respects the Board minimum;
- only affects ranking after verified payment;
- must be credited exactly once.

Board boost totals must not mutate the permanent Listing's normal ranking total.

## Board Lifecycle

Typical lifecycle:

**Requested â†’ Approved â†’ Upcoming â†’ Entry Open â†’ Entry Closed â†’ Running â†’ Ended â†’ Archived/Final**

Backend logic must enforce:
- no entry before opening;
- no entry after close;
- no Push Up after Board end;
- final ranking remains frozen;
- Board cannot be reused.

## Authentication and Roles

Anonymous users may browse public content.

Identity may be required for:
- Add Listing
- Board entry
- Push Up
- Board request
- Dashboard
- moderation
- payments

Roles:
- Admin
- Publisher
- Supporter

Privileged actions require server-side role enforcement.

## Admin Safety

Prefer reversible state changes over deletion:
- `published â†’ archived`
- `submitted â†’ rejected`
- `board â†’ ended`

For moderation actions, record actor, timestamp, previous state, new state, and reason where relevant.

## Deployment Policy

Do not automatically deploy production after every change.

Preferred flow:

**code â†’ validation â†’ commit â†’ test â†’ user approval/release checkpoint â†’ production deploy**

Before production deploy:
- production build passes;
- security rules reviewed if changed;
- Functions changes reviewed;
- environment variables confirmed;
- migrations reviewed;
- payment changes tested.

## Cloud Functions Safety

Functions must:
- validate inputs;
- authenticate where required;
- authorize ownership/role;
- avoid unbounded Firestore scans;
- use transactions/batches when needed;
- handle retries;
- log meaningful failures;
- protect secrets;
- distrust client payment state.

Scheduled functions must tolerate duplicate execution safely.

## Cost Control

Avoid:
- unnecessary Firestore listeners;
- repeated full-collection scans;
- large image assets;
- unnecessary function calls;
- unnecessary analytics writes;
- fake impression counters.

Prefer indexed queries, pagination, lightweight assets, and cost-aware aggregation.

## Analytics Integrity

Do not fabricate:
- views;
- visits;
- impressions;
- supporters;
- rankings;
- engagement.

If a metric is not reliably measured, do not display a fake number.

## UI Change Safety

When changing UI:
- preserve functionality unless intentionally changing it;
- avoid broad CSS selectors that affect unrelated elements;
- mobile is priority;
- desktop must not regress;
- modal fixes should be scoped;
- important controls remain discoverable;
- disabled controls should not look actionable.

For mobile dialogs:
- open near top-middle;
- remain scrollable;
- keep close/header visible;
- respect viewport height.

## Naming / Branding

Public product name currently:

`Visibility Marketplace`

Use `siteConfig.name` where practical.

Do not hard-code `ViewBid` into public UI unless product naming is intentionally changed.

`ViewBid` may remain an internal project/concept name.

## No Guessing About Current Code

Before modifying a file, inspect its current version whenever possible.

Do not assume an old patch still matches current code.

Prefer structural/robust edits over exact-whitespace matching.

Validate after changes.

## ChatGPT Direct GitHub Write Rule

If direct GitHub write access is available, default to a development/feature branch.

ChatGPT may:
- read repository files;
- create feature branches;
- edit/create code files;
- create commits;
- open pull requests;
- inspect CI;
- fix build errors.

ChatGPT must not, without explicit approval:
- delete repository;
- delete production branches;
- force-push;
- rewrite `main`;
- delete database;
- execute destructive production migrations;
- expose/rotate secrets;
- deploy destructive infrastructure changes.

## Explicit Approval Required

Explicit user approval is required before:
- database deletion;
- bulk data deletion;
- repository deletion;
- force push;
- history rewrite;
- destructive production migration;
- production Firebase project deletion;
- credential/secret deletion;
- large irreversible data mutation.

Approval must relate to the specific operation, not a generic earlier permission to write code.

## Recovery First

When something breaks:
1. inspect;
2. identify scope;
3. preserve current work;
4. apply smallest fix;
5. validate;
6. commit recovery.

Do not broadly delete/recreate project files unless necessary.

## Permanent Project Instruction

Whenever ChatGPT is developing ViewBid / Visibility Marketplace, this guideline should be treated as always applicable.

If a requested action conflicts with it:
1. point out the conflict;
2. explain the risk;
3. propose a safer approach;
4. obtain explicit approval if the risky action is still required.

## Short Version

**Read freely. Write carefully. Validate before commit. Prefer branches. Never delete production data or rewrite history without explicit approval. Never trust browser payment/ranking values. Keep critical writes atomic, idempotent, auditable, and server-verified.**
