import {
  type Firestore,
} from "firebase-admin/firestore";

import {
  HttpsError,
} from "firebase-functions/v2/https";

import {
  fulfillVerifiedPayment,
} from "./paymentCore";

export {
  fulfillVerifiedPayment,
};

export type PaymentPurpose =
  | "listing_submission"
  | "listing_push"
  | "board_activation"
  | "board_entry"
  | "board_entry_push";

export type PaymentTargetKind =
  | "listing"
  | "board"
  | "board_entry";

export type PaymentRequestInput = {
  purpose: PaymentPurpose;
  targetKind: PaymentTargetKind;
  targetId: string;
  amountMinor: number;
  currency: string;
  description?: string;
};

type ValidatedPaymentIntent = {
  purpose: PaymentPurpose;
  targetKind: PaymentTargetKind;
  targetId: string;
  amountMinor: number;
  currency: "INR";
  description: string;
  boardId?: string;
  listingId?: string;
};

export type MarketplacePricingConfig = {
  listingFeesMinor: Record<string, number>;
  publicPushMinimumMinor: Record<string, number>;
  boardActivationFeeMinor: number;
  boardEntryMinimumMinor: number;
  boardPushMinimumMinor: number;
  maximumPaymentMinor: number;
  currency: "INR";
};

export const INR_MINIMUM_PAYMENT_MINOR = 10_000; // Rs 100
export const INR_MAXIMUM_PAYMENT_MINOR = 9_990_000; // Rs 99,900

export const DEFAULT_INR_PRICING: MarketplacePricingConfig = {
  listingFeesMinor: {
    youtube: 10_000,
    facebook: 10_000,
    instagram: 10_000,
    x: 10_000,
    app: 29_900,
    startup: 49_900,
    website: 19_900,
    other: 19_900,
  },
  publicPushMinimumMinor: {
    youtube: 10_000,
    facebook: 10_000,
    instagram: 10_000,
    x: 10_000,
    app: 10_000,
    startup: 10_000,
    website: 10_000,
    other: 10_000,
  },
  boardActivationFeeMinor: 20_000,
  boardEntryMinimumMinor: 10_000,
  boardPushMinimumMinor: 10_000,
  maximumPaymentMinor: INR_MAXIMUM_PAYMENT_MINOR,
  currency: "INR",
};

function normalizeString(value: unknown): string {
  return String(value ?? "").trim();
}

function cloneDefaultPricing(): MarketplacePricingConfig {
  return {
    ...DEFAULT_INR_PRICING,
    listingFeesMinor: {
      ...DEFAULT_INR_PRICING.listingFeesMinor,
    },
    publicPushMinimumMinor: {
      ...DEFAULT_INR_PRICING.publicPushMinimumMinor,
    },
  };
}

function normalizeConfiguredMoney(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const amount = Number(value);

  return Number.isSafeInteger(amount) &&
    amount >= minimum &&
    amount <= maximum
    ? amount
    : fallback;
}

/**
 * INR is the single ViewBid base/settlement currency.
 * Old USD pricing documents are deliberately ignored instead of being
 * reinterpreted as paise (e.g. old 100 cents must never become Rs 1).
 */
export async function getMarketplacePricingConfig(
  db: Firestore,
): Promise<MarketplacePricingConfig> {
  const snapshot = await db
    .collection("marketplaceConfig")
    .doc("pricing")
    .get();

  if (!snapshot.exists) {
    return cloneDefaultPricing();
  }

  const data = snapshot.data() || {};

  if (normalizeString(data.currency).toUpperCase() !== "INR") {
    return cloneDefaultPricing();
  }

  const maximumPaymentMinor =
    normalizeConfiguredMoney(
      data.maximumPaymentMinor,
      DEFAULT_INR_PRICING.maximumPaymentMinor,
      INR_MINIMUM_PAYMENT_MINOR,
      INR_MAXIMUM_PAYMENT_MINOR,
    );

  const listingFeesMinor: Record<string, number> = {};
  const publicPushMinimumMinor: Record<string, number> = {};

  for (const typeId of Object.keys(DEFAULT_INR_PRICING.listingFeesMinor)) {
    listingFeesMinor[typeId] = normalizeConfiguredMoney(
      data.listingFeesMinor?.[typeId],
      DEFAULT_INR_PRICING.listingFeesMinor[typeId],
      0,
      maximumPaymentMinor,
    );

    publicPushMinimumMinor[typeId] = normalizeConfiguredMoney(
      data.publicPushMinimumMinor?.[typeId],
      DEFAULT_INR_PRICING.publicPushMinimumMinor[typeId],
      INR_MINIMUM_PAYMENT_MINOR,
      maximumPaymentMinor,
    );
  }

  return {
    listingFeesMinor,
    publicPushMinimumMinor,
    boardActivationFeeMinor: normalizeConfiguredMoney(
      data.boardActivationFeeMinor,
      DEFAULT_INR_PRICING.boardActivationFeeMinor,
      INR_MINIMUM_PAYMENT_MINOR,
      maximumPaymentMinor,
    ),
    boardEntryMinimumMinor: normalizeConfiguredMoney(
      data.boardEntryMinimumMinor,
      DEFAULT_INR_PRICING.boardEntryMinimumMinor,
      INR_MINIMUM_PAYMENT_MINOR,
      maximumPaymentMinor,
    ),
    boardPushMinimumMinor: normalizeConfiguredMoney(
      data.boardPushMinimumMinor,
      DEFAULT_INR_PRICING.boardPushMinimumMinor,
      INR_MINIMUM_PAYMENT_MINOR,
      maximumPaymentMinor,
    ),
    maximumPaymentMinor,
    currency: "INR",
  };
}

function assertMoney(amountMinor: number) {
  if (
    !Number.isSafeInteger(amountMinor) ||
    amountMinor < INR_MINIMUM_PAYMENT_MINOR ||
    amountMinor > INR_MAXIMUM_PAYMENT_MINOR
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid payment amount.",
    );
  }
}

function assertInrCurrency(value: unknown): "INR" {
  const currency = normalizeString(value || "INR").toUpperCase();

  if (currency !== "INR") {
    throw new HttpsError(
      "invalid-argument",
      "ViewBid base pricing is configured in INR.",
    );
  }

  return "INR";
}

function assertBoardCurrency(board: FirebaseFirestore.DocumentData | undefined) {
  if (normalizeString(board?.currency || "INR").toUpperCase() !== "INR") {
    throw new HttpsError(
      "failed-precondition",
      "This legacy Board uses the previous currency model. Create a new INR Board to accept payments.",
    );
  }
}

export async function validatePaymentRequest(
  db: Firestore,
  rawInput: unknown,
  actorUserId: string | null = null,
): Promise<ValidatedPaymentIntent> {
  const input = rawInput as Partial<PaymentRequestInput> | null | undefined;

  const purpose = normalizeString(input?.purpose) as PaymentPurpose;
  const targetKind = normalizeString(input?.targetKind) as PaymentTargetKind;
  const targetId = normalizeString(input?.targetId);
  const amountMinor = Number(input?.amountMinor);
  const currency = assertInrCurrency(input?.currency);
  const description = normalizeString(input?.description).slice(0, 160);

  if (![
    "listing_submission",
    "listing_push",
    "board_activation",
    "board_entry",
    "board_entry_push",
  ].includes(purpose)) {
    throw new HttpsError("invalid-argument", "Unsupported payment purpose.");
  }

  if (![
    "listing",
    "board",
    "board_entry",
  ].includes(targetKind)) {
    throw new HttpsError("invalid-argument", "Unsupported payment target.");
  }

  if (!targetId) {
    throw new HttpsError("invalid-argument", "Payment target is required.");
  }

  assertMoney(amountMinor);

  if (purpose === "listing_submission") {
    if (!actorUserId) {
      throw new HttpsError(
        "unauthenticated",
        "Authentication is required to pay a Listing submission fee.",
      );
    }

    if (targetKind !== "listing") {
      throw new HttpsError(
        "invalid-argument",
        "Listing submission payment requires a Listing target.",
      );
    }

    const listingSnap = await db.collection("listings").doc(targetId).get();
    if (!listingSnap.exists) {
      throw new HttpsError("not-found", "Listing not found.");
    }

    const listing = listingSnap.data();

    if (normalizeString(listing?.submittedByUserId) !== actorUserId) {
      throw new HttpsError(
        "permission-denied",
        "Only the Listing creator can pay its submission fee.",
      );
    }

    if (listing?.status !== "payment_pending") {
      throw new HttpsError(
        "failed-precondition",
        "This Listing is not awaiting its submission fee.",
      );
    }

    const snapshotFeeMinor = Number(listing?.submissionFeeMinor);
    const snapshotCurrency = normalizeString(
      listing?.submissionFeeCurrency || listing?.currency || "INR",
    ).toUpperCase();

    if (snapshotCurrency !== "INR") {
      throw new HttpsError(
        "failed-precondition",
        "This legacy Listing uses the previous currency model. Prepare a new INR submission payment.",
      );
    }

    if (
      !Number.isSafeInteger(snapshotFeeMinor) ||
      snapshotFeeMinor < INR_MINIMUM_PAYMENT_MINOR ||
      amountMinor !== snapshotFeeMinor
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Listing submission fee does not match the configured Listing Type fee.",
      );
    }

    return {
      purpose,
      targetKind,
      targetId,
      amountMinor,
      currency,
      description: description || `Listing submission - ${String(listing?.title || "listing")}`,
      listingId: targetId,
    };
  }

  if (purpose === "listing_push") {
    if (targetKind !== "listing") {
      throw new HttpsError(
        "invalid-argument",
        "Listing Push Up requires a Listing target.",
      );
    }

    const listingSnap = await db.collection("listings").doc(targetId).get();
    if (!listingSnap.exists) {
      throw new HttpsError("not-found", "Listing not found.");
    }

    const listing = listingSnap.data();
    if (listing?.status !== "published") {
      throw new HttpsError(
        "failed-precondition",
        "Only published listings can be pushed.",
      );
    }

    if (normalizeString(listing?.visibilityScope || "public") === "board_only") {
      throw new HttpsError(
        "failed-precondition",
        "Board-only listings cannot receive a Public Push Up.",
      );
    }

    const pricing = await getMarketplacePricingConfig(db);
    const typeId = normalizeString(listing?.listingTypeId);
    const minimumBoostMinor = Number(pricing.publicPushMinimumMinor[typeId]);

    if (!Number.isSafeInteger(minimumBoostMinor) || amountMinor < minimumBoostMinor) {
      throw new HttpsError(
        "invalid-argument",
        "Push Up amount is below the Listing Type minimum.",
      );
    }

    if (amountMinor > pricing.maximumPaymentMinor) {
      throw new HttpsError(
        "invalid-argument",
        "Push Up amount exceeds the configured maximum payment.",
      );
    }

    return {
      purpose,
      targetKind,
      targetId,
      amountMinor,
      currency,
      description: description || `Push Up ${String(listing?.title || "listing")}`,
      listingId: targetId,
    };
  }

  if (purpose === "board_activation") {
    if (!actorUserId) {
      throw new HttpsError(
        "unauthenticated",
        "Authentication is required to activate a Board.",
      );
    }

    if (targetKind !== "board") {
      throw new HttpsError(
        "invalid-argument",
        "Board activation requires a Board target.",
      );
    }

    const boardSnap = await db.collection("boards").doc(targetId).get();
    if (!boardSnap.exists) {
      throw new HttpsError("not-found", "Board not found.");
    }

    const board = boardSnap.data();
    assertBoardCurrency(board);

    if (normalizeString(board?.createdByUserId) !== actorUserId) {
      throw new HttpsError(
        "permission-denied",
        "Only the Board creator can activate this Board.",
      );
    }

    if (board?.status !== "awaiting_activation_payment") {
      throw new HttpsError(
        "failed-precondition",
        "This Board is not awaiting activation payment.",
      );
    }

    const activationFeeMinor = Number(board?.activationFeeMinor);
    if (
      !Number.isSafeInteger(activationFeeMinor) ||
      activationFeeMinor < INR_MINIMUM_PAYMENT_MINOR ||
      amountMinor !== activationFeeMinor
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Board activation fee does not match the Board.",
      );
    }

    const entryClosesAt = new Date(String(board?.entryClosesAt || "")).getTime();
    const endsAt = new Date(String(board?.endsAt || "")).getTime();

    if (
      Number.isNaN(entryClosesAt) ||
      Number.isNaN(endsAt) ||
      Date.now() >= entryClosesAt ||
      Date.now() >= endsAt
    ) {
      throw new HttpsError(
        "failed-precondition",
        "This Board can no longer be activated because its entry window has closed.",
      );
    }

    return {
      purpose,
      targetKind,
      targetId,
      amountMinor,
      currency,
      description: description || `Activate Board - ${String(board?.name || "Board")}`,
      boardId: targetId,
    };
  }

  if (targetKind !== "board_entry") {
    throw new HttpsError(
      "invalid-argument",
      "Board payment requires a Board Entry target.",
    );
  }

  const entrySnap = await db.collection("boardEntries").doc(targetId).get();
  if (!entrySnap.exists) {
    throw new HttpsError("not-found", "Board Entry not found.");
  }

  const entry = entrySnap.data();
  const boardId = normalizeString(entry?.boardId);
  const listingId = normalizeString(entry?.listingId);

  if (!boardId || !listingId) {
    throw new HttpsError(
      "failed-precondition",
      "Board Entry data is incomplete.",
    );
  }

  const boardSnap = await db.collection("boards").doc(boardId).get();
  if (!boardSnap.exists) {
    throw new HttpsError("not-found", "Board not found.");
  }

  const board = boardSnap.data();
  assertBoardCurrency(board);

  if (purpose === "board_entry") {
    if (!actorUserId) {
      throw new HttpsError(
        "unauthenticated",
        "Authentication is required to pay a Board Entry fee.",
      );
    }

    if (normalizeString(entry?.submittedByUserId) !== actorUserId) {
      throw new HttpsError(
        "permission-denied",
        "Only the Listing creator can pay this Board Entry fee.",
      );
    }

    if (entry?.status !== "pending_payment") {
      throw new HttpsError(
        "failed-precondition",
        "This Board Entry is not awaiting payment.",
      );
    }

    const boardStatus = normalizeString(board?.status);
    if (["expired", "archived", "cancelled", "rejected"].includes(boardStatus)) {
      throw new HttpsError("failed-precondition", "This Board is closed.");
    }

    const entryStartsAt = new Date(String(board?.entryStartsAt || "")).getTime();
    const entryClosesAt = new Date(String(board?.entryClosesAt || "")).getTime();
    const endsAt = new Date(String(board?.endsAt || "")).getTime();
    const nowMs = Date.now();

    if (
      Number.isNaN(entryStartsAt) ||
      Number.isNaN(entryClosesAt) ||
      Number.isNaN(endsAt) ||
      nowMs < entryStartsAt ||
      nowMs >= entryClosesAt ||
      nowMs >= endsAt
    ) {
      throw new HttpsError(
        "failed-precondition",
        "The Board entry payment window is closed.",
      );
    }

    const expectedAmount = Number(board?.entryFeeMinor);
    if (!Number.isSafeInteger(expectedAmount) || amountMinor !== expectedAmount) {
      throw new HttpsError(
        "invalid-argument",
        "Board Entry fee does not match the Board.",
      );
    }

    return {
      purpose,
      targetKind,
      targetId,
      amountMinor,
      currency,
      description: description || "Board Entry payment",
      boardId,
      listingId,
    };
  }

  if (entry?.status !== "entered") {
    throw new HttpsError(
      "failed-precondition",
      "Only entered Board listings can be pushed.",
    );
  }

  const boardStatus = normalizeString(board?.status);
  if (["expired", "archived", "cancelled", "rejected"].includes(boardStatus)) {
    throw new HttpsError("failed-precondition", "This Board is closed.");
  }

  const boardStartsAt = new Date(String(board?.startsAt || "")).getTime();
  const boardEndsAt = new Date(String(board?.endsAt || "")).getTime();

  if (Number.isNaN(boardStartsAt) || Number.isNaN(boardEndsAt)) {
    throw new HttpsError("failed-precondition", "Board dates are invalid.");
  }

  if (Date.now() < boardStartsAt) {
    throw new HttpsError("failed-precondition", "This Board has not started.");
  }

  if (Date.now() >= boardEndsAt) {
    throw new HttpsError("failed-precondition", "This Board has ended.");
  }

  const minimumBoostMinor = Number(board?.minimumBoostMinor);
  if (
    !Number.isSafeInteger(minimumBoostMinor) ||
    amountMinor < minimumBoostMinor
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Push Up amount is below the Board minimum.",
    );
  }

  return {
    purpose,
    targetKind,
    targetId,
    amountMinor,
    currency,
    description: description || "Board listing Push Up",
    boardId,
    listingId,
  };
}
