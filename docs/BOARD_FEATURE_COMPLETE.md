# Board Feature - Product Closure

## 1. Board creation

A Board is a one-time public visibility competition tied to exactly one Listing Type.

Board creation/request requires login.

The requester provides:

- Board name
- Listing Type
- Board start
- Entry start
- Entry close
- Board end
- Entry fee
- Minimum Push Up amount

Validation exists on both client and server.

Required date order:

`Starts < Entry starts < Entry closes < Ends`

A requested Board is created with status `requested`.

Admin approval is required before it becomes public.

An audit event is written when a Board is requested.

A Board is never reused after it ends.

---

## 2. Public Board discovery

Homepage:

- Normal permanent listings remain the primary content.
- A compact Board preview appears below the main listings.
- Only a small number of Boards are previewed.
- `See all boards` opens the Boards page.

Boards page:

- Public list of Boards.
- Search Boards.
- View Board action opens the Board detail page.

Board detail page:

- Board identity
- Listing Type
- Status
- Entry fee
- Minimum Push Up
- Schedule
- Entry state
- Actual entered listings
- Board-specific ranking
- Visit action
- Push Up action

Anonymous users can browse all of the above.

---

## 3. Board entry

Board entry requires login because the entrant must choose one of their own existing permanent listings.

Rules:

- Listing must already exist.
- Listing must be published.
- Listing Type must match the Board.
- Entry must happen inside the Board entry window.
- The same Listing cannot enter the same Board twice.
- A Board entry creates a `BoardEntry`.
- Initial status is `pending_payment`.
- Entry fee does not add to ranking.
- Only verified paid entries become `entered`.
- Only `entered` Board entries are shown publicly.

No duplicate Listing document is created.

---

## 4. Board ranking

Board ranking is independent from normal marketplace ranking.

Normal listing ranking:

`Listing.currentBoostTotalMinor`

Board ranking:

`BoardEntry.boostTotalMinor`

A Push Up inside a Board changes only the BoardEntry boost total.

A Push Up on the homepage changes only the permanent Listing boost total.

---

## 5. Push Up

The same reusable Push Up popup is used everywhere.

It accepts generic Push Up targets.

Supported contexts:

- Permanent marketplace Listing
- Entered Board Listing

The popup contains:

- Selected listing
- Current pushed amount
- Amount choices
- Minimum amount enforcement
- Continue to payment
- Payment caution

Login is not required for payment or Push Up.

Anyone may support any listing.

---

## 6. Payment architecture

Payment is a separate module.

Frontend:

- `features/payment/types.ts`
- `features/payment/PaymentDialog.tsx`
- `services/payments/paymentClient.ts`
- `features/payment/payment.css`

Backend:

- `functions/src/paymentCore.ts`
- callable `createPaymentIntent`

Supported payment purposes:

- `listing_push`
- `board_entry`
- `board_entry_push`

Supported targets:

- `listing`
- `board_entry`

The server validates the real target and amount before creating a Payment Intent.

Client success never changes ranking.

Payment verification must happen server-side through the future payment provider webhook.

The reusable backend fulfillment function is:

`fulfillVerifiedPayment(...)`

It is idempotent through `fulfilledAt`.

After verified payment:

- `listing_push` increments Listing boost total.
- `board_entry` changes BoardEntry to `entered`.
- `board_entry_push` increments BoardEntry boost total.

The payment provider is intentionally `unconfigured` for now.

When a gateway is chosen later, only the provider adapter / webhook needs to be connected.

---

## 7. Refund / payment notice

Board entry:

Entry fee activates participation only. It does not improve ranking.

Push Up:

Paid visibility affects ranking only after verified payment.

General:

Payments are non-refundable after successful processing, except where required by law.

---

## 8. Login rules

No login:

- Browse homepage
- Browse normal listings
- Browse Boards
- Open Board details
- View Board rankings
- Visit listings
- Push Up any listing
- Pay for any Push Up

Login required:

- Add Listing
- Request Board
- Enter Board
- My Listings
- My Boards
- Creator management

Admin role required:

- Board approval/rejection
- Moderation
- Administrative controls

---

## 9. Next phase

Admin section:

- Board request queue
- Approve / reject
- Board details
- Board entries
- Payment status visibility
- Listing moderation
- Board lifecycle controls
- Audit history
