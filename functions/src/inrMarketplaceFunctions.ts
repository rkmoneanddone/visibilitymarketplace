import {
  getApps,
  initializeApp,
} from "firebase-admin/app";

import {
  FieldValue,
  getFirestore,
} from "firebase-admin/firestore";

import {
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";

import {
  DEFAULT_INR_PRICING,
  INR_MAXIMUM_PAYMENT_MINOR,
  INR_MINIMUM_PAYMENT_MINOR,
  fulfillVerifiedPayment,
  getMarketplacePricingConfig,
  validatePaymentRequest,
} from "./inrPaymentCore";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

function normalizeString(value: unknown): string {
  return String(value ?? "").trim();
}

async function assertAdmin(uid: string) {
  const userSnap = await db.collection("users").doc(uid).get();

  if (!userSnap.exists || userSnap.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
}

function buildSearchTokens(...values: unknown[]): string[] {
  const result = new Set<string>();

  for (const value of values) {
    const normalized = normalizeString(value)
      .toLowerCase()
      .replace(/@/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!normalized) continue;

    for (const word of normalized.split(" ")) {
      const numericOnly = /^\d+$/.test(word);
      if (word.length < 2 && !numericOnly) continue;

      const maxPrefix = Math.min(word.length, 32);
      const startSize = numericOnly ? 1 : 2;

      for (let size = startSize; size <= maxPrefix; size += 1) {
        result.add(word.slice(0, size));
        if (result.size >= 120) return Array.from(result);
      }
    }
  }

  return Array.from(result);
}

function assertWholeRupeeAmount(
  amountMinor: number,
  label: string,
  allowZero = false,
) {
  const minimum = allowZero ? 0 : INR_MINIMUM_PAYMENT_MINOR;

  if (
    !Number.isSafeInteger(amountMinor) ||
    amountMinor < minimum ||
    amountMinor > INR_MAXIMUM_PAYMENT_MINOR ||
    amountMinor % 100 !== 0
  ) {
    throw new HttpsError(
      "invalid-argument",
      `${label} must be a whole-rupee amount between ${allowZero ? "Rs 0" : "Rs 100"} and Rs 99,900.`,
    );
  }
}

export const requestBoard = onCall(
  { region: "asia-south1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const name = normalizeString(request.data?.name);
    const listingTypeId = normalizeString(request.data?.listingTypeId);
    const startsAt = normalizeString(request.data?.startsAt);
    const entryStartsAt = normalizeString(request.data?.entryStartsAt);
    const entryClosesAt = normalizeString(request.data?.entryClosesAt);
    const endsAt = normalizeString(request.data?.endsAt);
    const currency = normalizeString(request.data?.currency || "INR").toUpperCase();
    const entryFeeMinor = Number(request.data?.entryFeeMinor);
    const minimumBoostMinor = Number(request.data?.minimumBoostMinor);

    if (!name || name.length > 80) {
      throw new HttpsError(
        "invalid-argument",
        "Board name is required and must be 80 characters or fewer.",
      );
    }

    const allowedListingTypeIds = new Set([
      "youtube",
      "facebook",
      "instagram",
      "x",
      "app",
      "startup",
      "website",
      "other",
    ]);

    if (!allowedListingTypeIds.has(listingTypeId)) {
      throw new HttpsError("invalid-argument", "Unsupported Listing Type.");
    }

    if (currency !== "INR") {
      throw new HttpsError(
        "invalid-argument",
        "ViewBid Board pricing is configured in INR.",
      );
    }

    assertWholeRupeeAmount(entryFeeMinor, "Entry fee");
    assertWholeRupeeAmount(minimumBoostMinor, "Minimum Push Up");

    if (!startsAt || !entryStartsAt || !entryClosesAt || !endsAt) {
      throw new HttpsError("invalid-argument", "All board dates are required.");
    }

    const startsDate = new Date(startsAt);
    const entryStartsDate = new Date(entryStartsAt);
    const entryClosesDate = new Date(entryClosesAt);
    const endsDate = new Date(endsAt);

    if ([startsDate, entryStartsDate, entryClosesDate, endsDate].some(
      (value) => Number.isNaN(value.getTime()),
    )) {
      throw new HttpsError("invalid-argument", "Invalid board dates.");
    }

    if (!(
      startsDate.getTime() < entryStartsDate.getTime() &&
      entryStartsDate.getTime() < entryClosesDate.getTime() &&
      entryClosesDate.getTime() < endsDate.getTime()
    )) {
      throw new HttpsError(
        "invalid-argument",
        "Dates must follow: Starts < Entry starts < Entry closes < Ends.",
      );
    }

    const pricingConfig = await getMarketplacePricingConfig(db);

    if (
      entryFeeMinor < pricingConfig.boardEntryMinimumMinor ||
      entryFeeMinor > pricingConfig.maximumPaymentMinor
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Board Entry fee is outside the current Admin pricing limits.",
      );
    }

    if (
      minimumBoostMinor < pricingConfig.boardPushMinimumMinor ||
      minimumBoostMinor > pricingConfig.maximumPaymentMinor
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Board minimum Push Up is outside the current Admin pricing limits.",
      );
    }

    const creatorSnap = await db.collection("users").doc(request.auth.uid).get();
    const creatorData = creatorSnap.data();
    const createdByDisplayName = normalizeString(
      creatorData?.displayName || request.auth.token.name || "",
    );
    const createdByEmail = normalizeString(
      creatorData?.email || request.auth.token.email || "",
    );

    const boardRef = db.collection("boards").doc();
    const auditRef = db
      .collection("auditEvents")
      .doc(`board_requested_${boardRef.id}`);

    await db.runTransaction(async (transaction) => {
      const now = FieldValue.serverTimestamp();

      transaction.set(boardRef, {
        id: boardRef.id,
        name,
        searchTokens: buildSearchTokens(name),
        slug: name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
        createdByUserId: request.auth!.uid,
        createdByDisplayName,
        createdByEmail,
        status: "requested",
        activationFeeMinor: pricingConfig.boardActivationFeeMinor,
        activationPaymentStatus: "unpaid",
        activationPaymentId: null,
        activatedAt: null,
        listingTypeId,
        startsAt,
        entryStartsAt,
        entryClosesAt,
        endsAt,
        entryFeeMinor,
        minimumBoostMinor,
        currency: "INR",
        createdAt: now,
        updatedAt: now,
      });

      transaction.set(auditRef, {
        id: auditRef.id,
        type: "board_requested",
        boardId: boardRef.id,
        actorUserId: request.auth!.uid,
        createdAt: now,
        metadata: {
          listingTypeId,
          currency: "INR",
        },
      });
    });

    return {
      success: true,
      boardId: boardRef.id,
    };
  },
);

export const getMarketplacePricing = onCall(
  { region: "asia-south1" },
  async () => ({
    success: true,
    pricing: await getMarketplacePricingConfig(db),
  }),
);

export const updateMarketplacePricing = onCall(
  { region: "asia-south1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    await assertAdmin(request.auth.uid);

    const raw = request.data?.pricing || {};
    const current = await getMarketplacePricingConfig(db);
    const maximumPaymentMinor = Number(
      raw.maximumPaymentMinor ?? current.maximumPaymentMinor,
    );

    assertWholeRupeeAmount(maximumPaymentMinor, "Maximum payment");

    const listingFeesMinor: Record<string, number> = {};
    const publicPushMinimumMinor: Record<string, number> = {};

    for (const typeId of Object.keys(DEFAULT_INR_PRICING.listingFeesMinor)) {
      const listingFee = Number(
        raw.listingFeesMinor?.[typeId] ?? current.listingFeesMinor[typeId],
      );
      const pushMinimum = Number(
        raw.publicPushMinimumMinor?.[typeId] ?? current.publicPushMinimumMinor[typeId],
      );

      assertWholeRupeeAmount(listingFee, `Listing fee for ${typeId}`, true);
      assertWholeRupeeAmount(pushMinimum, `Public Push minimum for ${typeId}`);

      if (listingFee > maximumPaymentMinor || pushMinimum > maximumPaymentMinor) {
        throw new HttpsError(
          "invalid-argument",
          `Pricing for ${typeId} exceeds the configured maximum payment.`,
        );
      }

      listingFeesMinor[typeId] = listingFee;
      publicPushMinimumMinor[typeId] = pushMinimum;
    }

    const boardActivationFeeMinor = Number(
      raw.boardActivationFeeMinor ?? current.boardActivationFeeMinor,
    );
    const boardEntryMinimumMinor = Number(
      raw.boardEntryMinimumMinor ?? current.boardEntryMinimumMinor,
    );
    const boardPushMinimumMinor = Number(
      raw.boardPushMinimumMinor ?? current.boardPushMinimumMinor,
    );

    for (const [label, value] of [
      ["Board activation fee", boardActivationFeeMinor],
      ["Board Entry minimum", boardEntryMinimumMinor],
      ["Board Push minimum", boardPushMinimumMinor],
    ] as const) {
      assertWholeRupeeAmount(value, label);
      if (value > maximumPaymentMinor) {
        throw new HttpsError(
          "invalid-argument",
          `${label} exceeds the configured maximum payment.`,
        );
      }
    }

    const pricing = {
      listingFeesMinor,
      publicPushMinimumMinor,
      boardActivationFeeMinor,
      boardEntryMinimumMinor,
      boardPushMinimumMinor,
      maximumPaymentMinor,
      currency: "INR" as const,
    };

    await db.collection("marketplaceConfig").doc("pricing").set(
      {
        ...pricing,
        updatedByAdminUserId: request.auth.uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return {
      success: true,
      pricing,
    };
  },
);

export const prepareListingSubmission = onCall(
  { region: "asia-south1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const listingId = normalizeString(request.data?.listingId);
    if (!listingId) {
      throw new HttpsError("invalid-argument", "listingId is required.");
    }

    const listingRef = db.collection("listings").doc(listingId);

    return db.runTransaction(async (transaction) => {
      const listingSnap = await transaction.get(listingRef);
      if (!listingSnap.exists) {
        throw new HttpsError("not-found", "Listing not found.");
      }

      const listing = listingSnap.data();
      if (normalizeString(listing?.submittedByUserId) !== request.auth!.uid) {
        throw new HttpsError(
          "permission-denied",
          "You can only submit a Listing from your account.",
        );
      }

      const status = normalizeString(listing?.status);
      if (["submitted", "under_review", "published"].includes(status)) {
        return {
          success: true,
          listingId,
          status,
          paymentRequired: false,
          amountMinor: 0,
          currency: "INR" as const,
        };
      }

      if (status !== "payment_pending") {
        throw new HttpsError(
          "failed-precondition",
          "This Listing cannot be submitted from its current status.",
        );
      }

      const pricingConfig = await getMarketplacePricingConfig(db);
      const typeId = normalizeString(listing?.listingTypeId);
      const feeMinor = Number(pricingConfig.listingFeesMinor[typeId]);

      if (!Number.isSafeInteger(feeMinor)) {
        throw new HttpsError(
          "failed-precondition",
          "Listing Type pricing is not configured.",
        );
      }

      const now = FieldValue.serverTimestamp();

      if (feeMinor <= 0) {
        transaction.update(listingRef, {
          status: "submitted",
          submissionFeeMinor: 0,
          submissionFeeCurrency: "INR",
          submissionPaymentStatus: "waived",
          updatedAt: now,
        });

        return {
          success: true,
          listingId,
          status: "submitted",
          paymentRequired: false,
          amountMinor: 0,
          currency: "INR" as const,
        };
      }

      transaction.update(listingRef, {
        submissionFeeMinor: feeMinor,
        submissionFeeCurrency: "INR",
        submissionPaymentStatus: "unpaid",
        updatedAt: now,
      });

      return {
        success: true,
        listingId,
        status: "payment_pending",
        paymentRequired: true,
        amountMinor: feeMinor,
        currency: "INR" as const,
      };
    });
  },
);

export const createBoardEntryIntent = onCall(
  { region: "asia-south1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const boardId = normalizeString(request.data?.boardId);
    const listingId = normalizeString(request.data?.listingId);

    if (!boardId || !listingId) {
      throw new HttpsError(
        "invalid-argument",
        "boardId and listingId are required.",
      );
    }

    const boardRef = db.collection("boards").doc(boardId);
    const listingRef = db.collection("listings").doc(listingId);
    const entryId = `${boardId}_${listingId}`;
    const entryRef = db.collection("boardEntries").doc(entryId);
    const auditRef = db.collection("auditEvents").doc(`board_entry_intent_${entryId}`);

    const result = await db.runTransaction(async (transaction) => {
      const [boardSnap, listingSnap, entrySnap] = await Promise.all([
        transaction.get(boardRef),
        transaction.get(listingRef),
        transaction.get(entryRef),
      ]);

      if (!boardSnap.exists) throw new HttpsError("not-found", "Board not found.");
      if (!listingSnap.exists) throw new HttpsError("not-found", "Listing not found.");

      const board = boardSnap.data();
      const listing = listingSnap.data();
      if (!board || !listing) {
        throw new HttpsError("not-found", "Board or Listing data not found.");
      }

      if (normalizeString(board.currency || "").toUpperCase() !== "INR") {
        throw new HttpsError(
          "failed-precondition",
          "This legacy Board uses the previous currency model. Create a new INR Board.",
        );
      }

      if (!["approved", "entry_open", "active"].includes(String(board.status))) {
        throw new HttpsError(
          "failed-precondition",
          "This Board is not accepting entries.",
        );
      }

      const nowMs = Date.now();
      const entryStartsMs = new Date(String(board.entryStartsAt)).getTime();
      const entryClosesMs = new Date(String(board.entryClosesAt)).getTime();
      const endsMs = new Date(String(board.endsAt)).getTime();

      if (
        Number.isNaN(entryStartsMs) ||
        Number.isNaN(entryClosesMs) ||
        Number.isNaN(endsMs) ||
        nowMs < entryStartsMs ||
        nowMs >= entryClosesMs ||
        nowMs >= endsMs
      ) {
        throw new HttpsError(
          "failed-precondition",
          "The Board entry window is closed.",
        );
      }

      if (listing.submittedByUserId !== request.auth!.uid) {
        throw new HttpsError(
          "permission-denied",
          "You can only enter a listing from your account.",
        );
      }

      if (listing.listingTypeId !== board.listingTypeId) {
        throw new HttpsError(
          "failed-precondition",
          "This listing type is not eligible for this Board.",
        );
      }

      if (board.categoryId && listing.categoryId !== board.categoryId) {
        throw new HttpsError(
          "failed-precondition",
          "This listing category is not eligible for this Board.",
        );
      }

      if (board.subcategoryId && listing.subcategoryId !== board.subcategoryId) {
        throw new HttpsError(
          "failed-precondition",
          "This listing subcategory is not eligible for this Board.",
        );
      }

      const listingStatus = String(listing.status || "");
      if (!["payment_pending", "submitted", "under_review", "published"].includes(listingStatus)) {
        throw new HttpsError(
          "failed-precondition",
          "This listing cannot enter the Board from its current status.",
        );
      }

      if (entrySnap.exists) {
        const existing = entrySnap.data();
        if (existing?.status === "entered") {
          throw new HttpsError(
            "already-exists",
            "This listing is already entered in the Board.",
          );
        }
        if (existing?.status === "pending_payment") {
          return { status: "pending_payment" as const, paymentRequired: true };
        }
        if (existing?.status === "pending_review") {
          if (listingStatus === "published") {
            transaction.update(entryRef, {
              status: "pending_payment",
              updatedAt: FieldValue.serverTimestamp(),
            });
            return { status: "pending_payment" as const, paymentRequired: true };
          }
          return { status: "pending_review" as const, paymentRequired: false };
        }
        throw new HttpsError(
          "failed-precondition",
          "This listing already has a Board entry record.",
        );
      }

      const initialStatus = listingStatus === "published"
        ? "pending_payment"
        : "pending_review";
      const now = FieldValue.serverTimestamp();

      transaction.set(entryRef, {
        id: entryId,
        boardId,
        boardName: normalizeString(board.name),
        listingId,
        searchTokens: buildSearchTokens(listing.title, listing.handle),
        listingTitle: normalizeString(listing.title),
        listingHandle: normalizeString(listing.handle) || null,
        listingExternalUrl: normalizeString(listing.externalUrl),
        listingFeaturedImageUrl: normalizeString(listing.featuredImageUrl) || null,
        listingTypeId: normalizeString(listing.listingTypeId),
        submittedByUserId: request.auth!.uid,
        status: initialStatus,
        entryFeeMinor: Number(board.entryFeeMinor),
        currency: "INR",
        entryPaymentId: null,
        boostTotalMinor: 0,
        supporterCount: 0,
        externalClicks: 0,
        joinedAt: now,
        updatedAt: now,
      });

      transaction.set(auditRef, {
        id: auditRef.id,
        type: "board_entry_intent_created",
        boardId,
        listingId,
        boardEntryId: entryId,
        actorUserId: request.auth!.uid,
        createdAt: now,
        metadata: {
          status: initialStatus,
          entryFeeMinor: Number(board.entryFeeMinor),
          currency: "INR",
        },
      });

      return {
        status: initialStatus,
        paymentRequired: initialStatus === "pending_payment",
      };
    });

    return {
      success: true,
      boardEntryId: entryId,
      status: result.status,
      paymentRequired: result.paymentRequired,
    };
  },
);

export const createPushUpIntent = onCall(
  { region: "asia-south1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const listingId = normalizeString(request.data?.listingId);
    const boardPeriodId = normalizeString(request.data?.boardPeriodId || "current");
    const currency = normalizeString(request.data?.currency || "INR").toUpperCase();
    const amountMinor = Number(request.data?.amountMinor);

    if (!listingId) {
      throw new HttpsError("invalid-argument", "listingId is required.");
    }

    if (currency !== "INR") {
      throw new HttpsError("invalid-argument", "ViewBid base pricing is INR.");
    }

    const pricing = await getMarketplacePricingConfig(db);
    if (
      !Number.isSafeInteger(amountMinor) ||
      amountMinor < INR_MINIMUM_PAYMENT_MINOR ||
      amountMinor > pricing.maximumPaymentMinor
    ) {
      throw new HttpsError("invalid-argument", "Invalid Push Up amount.");
    }

    const listingRef = db.collection("listings").doc(listingId);
    const listingSnap = await listingRef.get();

    if (!listingSnap.exists || listingSnap.data()?.status !== "published") {
      throw new HttpsError(
        "failed-precondition",
        "Only published listings can be pushed.",
      );
    }

    const listing = listingSnap.data()!;
    const minimum = Number(
      pricing.publicPushMinimumMinor[normalizeString(listing.listingTypeId)],
    );

    if (!Number.isSafeInteger(minimum) || amountMinor < minimum) {
      throw new HttpsError(
        "invalid-argument",
        "Push Up amount is below the Listing Type minimum.",
      );
    }

    const boostRef = db.collection("boosts").doc();
    const auditRef = db.collection("auditEvents").doc(`push_up_intent_${boostRef.id}`);
    const now = FieldValue.serverTimestamp();

    await db.runTransaction(async (transaction) => {
      transaction.set(boostRef, {
        id: boostRef.id,
        listingId,
        boardPeriodId,
        supporterUserId: request.auth!.uid,
        source: listing.submittedByUserId === request.auth!.uid
          ? "owner"
          : "supporter",
        amountMinor,
        currency: "INR",
        paymentId: null,
        paymentProvider: null,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });

      transaction.set(auditRef, {
        id: auditRef.id,
        type: "push_up_intent_created",
        listingId,
        boostId: boostRef.id,
        actorUserId: request.auth!.uid,
        createdAt: now,
        metadata: { amountMinor, currency: "INR", boardPeriodId },
      });
    });

    return {
      success: true,
      boostId: boostRef.id,
      status: "pending",
      amountMinor,
      currency: "INR" as const,
      paymentRequired: true,
    };
  },
);

export const createPaymentIntent = onCall(
  { region: "asia-south1" },
  async (request) => {
    const validated = await validatePaymentRequest(
      db,
      request.data,
      request.auth?.uid ?? null,
    );

    const paymentRef = db.collection("paymentIntents").doc();
    const now = FieldValue.serverTimestamp();

    await paymentRef.set({
      id: paymentRef.id,
      ...validated,
      status: "created",
      provider: "unconfigured",
      providerPaymentId: null,
      createdByUserId: request.auth?.uid ?? null,
      createdAt: now,
      updatedAt: now,
      verifiedAt: null,
      fulfilledAt: null,
    });

    return {
      success: true,
      paymentIntentId: paymentRef.id,
      status: "created",
      providerReady: false,
      checkoutUrl: null,
    };
  },
);

export const completeEmulatorPayment = onCall(
  { region: "asia-south1" },
  async (request) => {
    if (process.env.FUNCTIONS_EMULATOR !== "true") {
      throw new HttpsError(
        "failed-precondition",
        "Emulator payment completion is available only in the Firebase Emulator.",
      );
    }

    const paymentIntentId = normalizeString(request.data?.paymentIntentId);
    if (!paymentIntentId) {
      throw new HttpsError("invalid-argument", "paymentIntentId is required.");
    }

    const paymentRef = db.collection("paymentIntents").doc(paymentIntentId);
    const paymentSnap = await paymentRef.get();

    if (!paymentSnap.exists) {
      throw new HttpsError("not-found", "Payment intent not found.");
    }

    const payment = paymentSnap.data();
    if (payment?.fulfilledAt) {
      return {
        success: true,
        paymentIntentId,
        status: "paid" as const,
        alreadyFulfilled: true,
      };
    }

    if (payment?.provider !== "unconfigured" || payment?.status !== "created") {
      throw new HttpsError(
        "failed-precondition",
        "This payment cannot be emulator-completed.",
      );
    }

    const providerPaymentId = `emulator_${paymentIntentId}`;
    await fulfillVerifiedPayment(db, paymentIntentId, providerPaymentId);

    return {
      success: true,
      paymentIntentId,
      status: "paid" as const,
      alreadyFulfilled: false,
    };
  },
);
