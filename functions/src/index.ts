import {
  onCall,
  HttpsError,
} from "firebase-functions/v2/https";

import {
  initializeApp,
} from "firebase-admin/app";

import {
  getFirestore,
  FieldValue,
} from "firebase-admin/firestore";

import {
  fulfillVerifiedPayment,
  getMarketplacePricingConfig,
  validatePaymentRequest,
} from "./paymentCore";
initializeApp();

const db = getFirestore();

async function assertAdmin(
  uid: string,
) {
  const userSnap =
    await db
      .collection("users")
      .doc(uid)
      .get();

  if (!userSnap.exists) {
    throw new HttpsError(
      "permission-denied",
      "Admin access required.",
    );
  }

  const role =
    userSnap.data()?.role;

  if (role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Admin access required.",
    );
  }
}

function normalizeString(
  value: unknown,
): string {
  return String(value ?? "").trim();
}

function buildSearchTokens(
  ...values: unknown[]
): string[] {
  const result =
    new Set<string>();

  for (const value of values) {
    const normalized =
      normalizeString(value)
        .toLowerCase()
        .replace(/@/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!normalized) {
      continue;
    }

    for (
      const word
      of normalized.split(" ")
    ) {
      const numericOnly =
        /^\d+$/.test(
          word,
        );

      if (
        word.length < 2 &&
        !numericOnly
      ) {
        continue;
      }

      const maxPrefix =
        Math.min(
          word.length,
          32,
        );

      const startSize =
        numericOnly
          ? 1
          : 2;

      for (
        let size = startSize;
        size <= maxPrefix;
        size += 1
      ) {
        result.add(
          word.slice(0, size),
        );

        if (
          result.size >= 120
        ) {
          return Array.from(
            result,
          );
        }
      }
    }
  }

  return Array.from(
    result,
  );
}

function canManageListing(
  listing: FirebaseFirestore.DocumentData,
  uid: string,
): boolean {
  if (
    listing.submittedByUserId === uid
  ) {
    return true;
  }

  // Legacy compatibility only.
  if (
    listing.claimedOwnerUserId === uid
  ) {
    return true;
  }

  return false;
}

export const requestBoard =
  onCall(
    {
      region: "asia-south1",
    },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Authentication required.",
        );
      }

      const name =
        normalizeString(
          request.data?.name,
        );

      const listingTypeId =
        normalizeString(
          request.data
            ?.listingTypeId,
        );

      const startsAt =
        normalizeString(
          request.data?.startsAt,
        );

      const entryStartsAt =
        normalizeString(
          request.data
            ?.entryStartsAt,
        );

      const entryClosesAt =
        normalizeString(
          request.data
            ?.entryClosesAt,
        );

      const endsAt =
        normalizeString(
          request.data?.endsAt,
        );

      const currency =
        normalizeString(
          request.data
            ?.currency ||
          "USD",
        ).toUpperCase();

      const entryFeeMinor =
        Number(
          request.data
            ?.entryFeeMinor,
        );

      const minimumBoostMinor =
        Number(
          request.data
            ?.minimumBoostMinor,
        );

      if (
        !name ||
        name.length > 80
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Board name is required and must be 80 characters or fewer.",
        );
      }

      if (!listingTypeId) {
        throw new HttpsError(
          "invalid-argument",
          "Listing type is required.",
        );
      }

      const allowedListingTypeIds =
        new Set([
          "youtube",
          "facebook",
          "instagram",
          "x",
          "app",
          "startup",
          "website",
          "other",
        ]);

      if (
        !allowedListingTypeIds.has(
          listingTypeId,
        )
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Unsupported Listing Type.",
        );
      }

      if (currency !== "USD") {
        throw new HttpsError(
          "invalid-argument",
          "Unsupported currency.",
        );
      }

      if (
        !Number.isSafeInteger(
          entryFeeMinor,
        ) ||
        entryFeeMinor < 100 ||
        entryFeeMinor > 99900 ||
        entryFeeMinor % 100 !== 0
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Entry fee must be a whole dollar amount between $1 and $999.",
        );
      }

      if (
        !Number.isSafeInteger(
          minimumBoostMinor,
        ) ||
        minimumBoostMinor <
        100 ||
        minimumBoostMinor >
        99900 ||
        minimumBoostMinor %
        100 !==
        0
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Minimum Push Up must be a whole dollar amount between $1 and $999.",
        );
      }

      if (
        !startsAt ||
        !entryStartsAt ||
        !entryClosesAt ||
        !endsAt
      ) {
        throw new HttpsError(
          "invalid-argument",
          "All board dates are required.",
        );
      }

      const startsDate =
        new Date(startsAt);

      const entryStartsDate =
        new Date(
          entryStartsAt,
        );

      const entryClosesDate =
        new Date(
          entryClosesAt,
        );

      const endsDate =
        new Date(endsAt);

      if (
        Number.isNaN(
          startsDate.getTime(),
        ) ||
        Number.isNaN(
          entryStartsDate.getTime(),
        ) ||
        Number.isNaN(
          entryClosesDate.getTime(),
        ) ||
        Number.isNaN(
          endsDate.getTime(),
        )
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Invalid board dates.",
        );
      }

      if (
        !(
          startsDate.getTime() <
          entryStartsDate.getTime() &&
          entryStartsDate.getTime() <
          entryClosesDate.getTime() &&
          entryClosesDate.getTime() <
          endsDate.getTime()
        )
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Dates must follow: Starts < Entry starts < Entry closes < Ends.",
        );
      }


      const creatorSnap =
        await db
          .collection("users")
          .doc(request.auth.uid)
          .get();

      const creatorData =
        creatorSnap.data();

      const createdByDisplayName =
        normalizeString(
          creatorData?.displayName ||
          request.auth.token.name ||
          "",
        );

      const createdByEmail =
        normalizeString(
          creatorData?.email ||
          request.auth.token.email ||
          "",
        );

      const pricingConfig =
        await getMarketplacePricingConfig(
          db,
        );

      if (
        entryFeeMinor <
          pricingConfig
            .boardEntryMinimumMinor ||
        entryFeeMinor >
          pricingConfig
            .maximumPaymentMinor
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Board Entry fee is outside the current Admin pricing limits.",
        );
      }

      if (
        minimumBoostMinor <
          pricingConfig
            .boardPushMinimumMinor ||
        minimumBoostMinor >
          pricingConfig
            .maximumPaymentMinor
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Board minimum Push Up is outside the current Admin pricing limits.",
        );
      }

      const boardRef =
        db
          .collection("boards")
          .doc();

      const auditRef =
        db
          .collection(
            "auditEvents",
          )
          .doc(
            `board_requested_${boardRef.id}`,
          );

      await db.runTransaction(
        async (transaction) => {
          const now =
            FieldValue
              .serverTimestamp();

          transaction.set(
            boardRef,
            {
              id: boardRef.id,

              name,

              searchTokens:
                buildSearchTokens(
                  name,
                ),

              slug:
                name
                  .toLowerCase()
                  .replace(
                    /[^a-z0-9]+/g,
                    "-",
                  )
                  .replace(
                    /^-+|-+$/g,
                    "",
                  ),

              createdByUserId:
                request.auth!.uid,

              createdByDisplayName,
              createdByEmail,

              status:
                "requested",

              activationFeeMinor:
                pricingConfig
                  .boardActivationFeeMinor,

              activationPaymentStatus:
                "unpaid",

              activationPaymentId:
                null,

              activatedAt:
                null,

              listingTypeId,

              startsAt,
              entryStartsAt,
              entryClosesAt,
              endsAt,

              entryFeeMinor,
              minimumBoostMinor,

              currency,

              createdAt: now,
              updatedAt: now,
            },
          );

          transaction.set(
            auditRef,
            {
              id:
                auditRef.id,

              type:
                "board_requested",

              boardId:
                boardRef.id,

              actorUserId:
                request.auth!.uid,

              createdAt: now,

              metadata: {
                listingTypeId,
              },
            },
          );
        },
      );

      return {
        success: true,
        boardId:
          boardRef.id,
      };
    },
  );

export const rejectBoard =
  onCall(
    {
      region: "asia-south1",
    },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Authentication required.",
        );
      }

      const boardId =
        String(
          request.data?.boardId ?? "",
        ).trim();

      const reason =
        String(
          request.data?.reason ?? "",
        ).trim();

      if (!boardId) {
        throw new HttpsError(
          "invalid-argument",
          "boardId is required.",
        );
      }

      if (!reason) {
        throw new HttpsError(
          "invalid-argument",
          "Rejection reason is required.",
        );
      }

      await assertAdmin(
        request.auth.uid,
      );

      const boardRef =
        db
          .collection("boards")
          .doc(boardId);

      const auditRef =
        db
          .collection("auditEvents")
          .doc(
            `board_rejected_${boardId}`,
          );

      await db.runTransaction(
        async (transaction) => {
          const boardSnap =
            await transaction.get(
              boardRef,
            );

          if (!boardSnap.exists) {
            throw new HttpsError(
              "not-found",
              "Board not found.",
            );
          }

          const board =
            boardSnap.data();

          if (!board) {
            throw new HttpsError(
              "not-found",
              "Board data not found.",
            );
          }

          if (
            board.status ===
            "rejected"
          ) {
            return;
          }

          if (
            board.status !==
            "requested"
          ) {
            throw new HttpsError(
              "failed-precondition",
              `Board cannot be rejected from status: ${board.status}`,
            );
          }

          const now =
            FieldValue.serverTimestamp();

          transaction.update(
            boardRef,
            {
              status: "rejected",

              rejectedAt: now,

              rejectionReason:
                reason,

              updatedAt: now,
            },
          );

          transaction.set(
            auditRef,
            {
              id: auditRef.id,

              type:
                "board_rejected",

              boardId,

              actorUserId:
                request.auth!.uid,

              createdAt: now,

              metadata: {
                reason,
              },
            },
          );
        },
      );

      return {
        success: true,
        boardId,
      };
    },
  );

export const approveBoard =
  onCall(
    {
      region: "asia-south1",
    },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Authentication required.",
        );
      }

      const boardId =
        String(
          request.data?.boardId ?? "",
        ).trim();

      if (!boardId) {
        throw new HttpsError(
          "invalid-argument",
          "boardId is required.",
        );
      }

      await assertAdmin(
        request.auth.uid,
      );

      const boardRef =
        db
          .collection("boards")
          .doc(boardId);

      const auditRef =
        db
          .collection("auditEvents")
          .doc(
            `board_approved_${boardId}`,
          );

      await db.runTransaction(
        async (transaction) => {
          const boardSnap =
            await transaction.get(
              boardRef,
            );

          if (!boardSnap.exists) {
            throw new HttpsError(
              "not-found",
              "Board not found.",
            );
          }

          const board =
            boardSnap.data();

          if (!board) {
            throw new HttpsError(
              "not-found",
              "Board data not found.",
            );
          }

          if (
            board.status ===
              "awaiting_activation_payment" ||
            board.status ===
              "approved" ||
            board.status ===
              "entry_open"
          ) {
            return;
          }

          if (
            board.status !==
            "requested"
          ) {
            throw new HttpsError(
              "failed-precondition",
              `Board cannot be approved from status: ${board.status}`,
            );
          }

          const now =
            FieldValue.serverTimestamp();

          transaction.update(
            boardRef,
            {
              status:
                "awaiting_activation_payment",

              activationPaymentStatus:
                "unpaid",

              approvedByAdminUserId:
                request.auth!.uid,

              approvedAt: now,
              updatedAt: now,
            },
          );

          transaction.set(
            auditRef,
            {
              id: auditRef.id,

              type:
                "board_approved",

              boardId,

              actorUserId:
                request.auth!.uid,

              createdAt: now,

              metadata: {},
            },
          );
        },
      );

      return {
        success: true,
        boardId,
      };
    },
  );

export const archiveListing =
  onCall(
    {
      region: "asia-south1",
    },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Authentication required.",
        );
      }

      const listingId =
        String(
          request.data?.listingId ??
          "",
        ).trim();

      if (!listingId) {
        throw new HttpsError(
          "invalid-argument",
          "listingId is required.",
        );
      }

      const listingRef =
        db
          .collection("listings")
          .doc(listingId);

      const auditRef =
        db
          .collection("auditEvents")
          .doc(
            `listing_archived_${listingId}`,
          );

      await db.runTransaction(
        async (transaction) => {
          const listingSnap =
            await transaction.get(
              listingRef,
            );

          if (!listingSnap.exists) {
            throw new HttpsError(
              "not-found",
              "Listing not found.",
            );
          }

          const listing =
            listingSnap.data();

          if (!listing) {
            throw new HttpsError(
              "not-found",
              "Listing data not found.",
            );
          }

          if (
            !canManageListing(
              listing,
              request.auth!.uid,
            )
          ) {
            throw new HttpsError(
              "permission-denied",
              "You cannot manage this listing.",
            );
          }

          if (
            listing.status ===
            "archived"
          ) {
            return;
          }

          if (
            listing.status !==
            "published"
          ) {
            throw new HttpsError(
              "failed-precondition",
              `Listing cannot be archived from status: ${listing.status}`,
            );
          }

          const now =
            FieldValue.serverTimestamp();

          transaction.update(
            listingRef,
            {
              status: "archived",
              archivedAt: now,
              updatedAt: now,
            },
          );

          transaction.set(
            auditRef,
            {
              id: auditRef.id,
              type:
                "listing_archived",
              listingId,
              actorUserId:
                request.auth!.uid,
              createdAt: now,
              metadata: {},
            },
          );
        },
      );

      return {
        success: true,
        listingId,
      };
    },
  );

export const publishListing =
  onCall(
    {
      region: "asia-south1",
    },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Authentication required.",
        );
      }

      const listingId =
        String(
          request.data?.listingId ??
          "",
        ).trim();

      if (!listingId) {
        throw new HttpsError(
          "invalid-argument",
          "listingId is required.",
        );
      }

      await assertAdmin(
        request.auth.uid,
      );

      const listingRef =
        db
          .collection("listings")
          .doc(listingId);

      const auditRef =
        db
          .collection(
            "auditEvents",
          )
          .doc(
            `listing_published_${listingId}`,
          );

      await db.runTransaction(
        async (transaction) => {
          const listingSnap =
            await transaction.get(
              listingRef,
            );

          if (!listingSnap.exists) {
            throw new HttpsError(
              "not-found",
              "Listing not found.",
            );
          }

          const listing =
            listingSnap.data();

          const status =
            listing?.status;

          if (
            status === "published"
          ) {
            return;
          }

          if (
            status !== "submitted" &&
            status !==
            "under_review"
          ) {
            throw new HttpsError(
              "failed-precondition",
              `Listing cannot be published from status: ${status}`,
            );
          }

          const now =
            FieldValue.serverTimestamp();

          transaction.update(
            listingRef,
            {
              status:
                "published",
              publishedAt: now,
              updatedAt: now,
            },
          );

          transaction.set(
            auditRef,
            {
              id:
                auditRef.id,
              type:
                "listing_published",
              listingId,
              actorUserId:
                request.auth!.uid,
              createdAt: now,
              metadata: {},
            },
          );
        },
      );

      return {
        success: true,
        listingId,
      };
    },
  );

export const rejectListing =
  onCall(
    {
      region: "asia-south1",
    },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Authentication required.",
        );
      }

      const listingId =
        String(
          request.data?.listingId ??
          "",
        ).trim();

      const reason =
        String(
          request.data?.reason ??
          "",
        ).trim();

      if (!listingId) {
        throw new HttpsError(
          "invalid-argument",
          "listingId is required.",
        );
      }

      if (!reason) {
        throw new HttpsError(
          "invalid-argument",
          "Rejection reason is required.",
        );
      }

      await assertAdmin(
        request.auth.uid,
      );

      const listingRef =
        db
          .collection("listings")
          .doc(listingId);

      const auditRef =
        db
          .collection(
            "auditEvents",
          )
          .doc(
            `listing_rejected_${listingId}`,
          );

      await db.runTransaction(
        async (transaction) => {
          const listingSnap =
            await transaction.get(
              listingRef,
            );

          if (!listingSnap.exists) {
            throw new HttpsError(
              "not-found",
              "Listing not found.",
            );
          }

          const listing =
            listingSnap.data();

          const status =
            listing?.status;

          if (
            status === "rejected"
          ) {
            return;
          }

          if (
            status !== "submitted" &&
            status !==
            "under_review"
          ) {
            throw new HttpsError(
              "failed-precondition",
              `Listing cannot be rejected from status: ${status}`,
            );
          }

          const now =
            FieldValue.serverTimestamp();

          transaction.update(
            listingRef,
            {
              status:
                "rejected",
              rejectionReason:
                reason,
              rejectedAt: now,
              updatedAt: now,
            },
          );

          transaction.set(
            auditRef,
            {
              id:
                auditRef.id,
              type:
                "listing_rejected",
              listingId,
              actorUserId:
                request.auth!.uid,
              createdAt: now,
              metadata: {
                reason,
              },
            },
          );
        },
      );

      return {
        success: true,
        listingId,
      };
    },
  );

/* BEGIN VIEWBID CREATE PUSH UP INTENT V1 */

export const createPushUpIntent =
  onCall(
    {
      region: "asia-south1",
    },
    async (request) => {
const listingId =
        normalizeString(
          request.data?.listingId,
        );

      const boardPeriodId =
        normalizeString(
          request.data?.boardPeriodId ||
          "current",
        );

      const currency =
        normalizeString(
          request.data?.currency ||
          "USD",
        ).toUpperCase();

      const amountMinor =
        Number(
          request.data?.amountMinor,
        );

      if (!listingId) {
        throw new HttpsError(
          "invalid-argument",
          "listingId is required.",
        );
      }

      if (
        !Number.isSafeInteger(amountMinor) ||
        ![
          100,
          500,
          1000,
          2500,
        ].includes(amountMinor)
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Invalid Push Up amount.",
        );
      }

      if (currency !== "USD") {
        throw new HttpsError(
          "invalid-argument",
          "Unsupported currency.",
        );
      }

      const listingRef =
        db
          .collection("listings")
          .doc(listingId);

      const boostRef =
        db
          .collection("boosts")
          .doc();

      const auditRef =
        db
          .collection("auditEvents")
          .doc(
            `push_up_intent_${boostRef.id}`,
          );

      await db.runTransaction(
        async (transaction) => {
          const listingSnap =
            await transaction.get(
              listingRef,
            );

          if (!listingSnap.exists) {
            throw new HttpsError(
              "not-found",
              "Listing not found.",
            );
          }

          const listing =
            listingSnap.data();

          if (
            !listing ||
            listing.status !==
              "published"
          ) {
            throw new HttpsError(
              "failed-precondition",
              "Only published listings can be pushed.",
            );
          }

          const now =
            FieldValue.serverTimestamp();

          transaction.set(
            boostRef,
            {
              id: boostRef.id,
              listingId,
              boardPeriodId,

              supporterUserId:
                request.auth!.uid,

              source:
                listing.submittedByUserId ===
                request.auth!.uid
                  ? "owner"
                  : "supporter",

              amountMinor,
              currency,

              paymentId: null,
              paymentProvider: null,

              status: "pending",

              createdAt: now,
              updatedAt: now,
            },
          );

          transaction.set(
            auditRef,
            {
              id: auditRef.id,

              type:
                "push_up_intent_created",

              listingId,
              boostId:
                boostRef.id,

              actorUserId:
                request.auth!.uid,

              createdAt: now,

              metadata: {
                amountMinor,
                currency,
                boardPeriodId,
              },
            },
          );
        },
      );

      return {
        success: true,
        boostId:
          boostRef.id,
        status: "pending",
        amountMinor,
        currency,
        paymentRequired: true,
      };
    },
  );

/* END VIEWBID CREATE PUSH UP INTENT V1 */

/* BEGIN VIEWBID MARKETPLACE PRICING CONFIG V2 */

export const getMarketplacePricing =
  onCall(
    {
      region: "asia-south1",
    },
    async () => {
      const pricing =
        await getMarketplacePricingConfig(
          db,
        );

      return {
        success: true,
        pricing,
      };
    },
  );

export const updateMarketplacePricing =
  onCall(
    {
      region: "asia-south1",
    },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Authentication required.",
        );
      }

      await assertAdmin(
        request.auth.uid,
      );

      const raw =
        request.data?.pricing ||
        {};

      const current =
        await getMarketplacePricingConfig(
          db,
        );

      const maximumPaymentMinor =
        Number(
          raw.maximumPaymentMinor ??
          current.maximumPaymentMinor,
        );

      if (
        !Number.isSafeInteger(
          maximumPaymentMinor,
        ) ||
        maximumPaymentMinor < 100 ||
        maximumPaymentMinor > 99900
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Maximum payment must be between $1 and $999.",
        );
      }

      const listingFeesMinor:
        Record<string, number> = {};

      const publicPushMinimumMinor:
        Record<string, number> = {};

      for (
        const typeId
        of Object.keys(
          current.listingFeesMinor,
        )
      ) {
        const listingFee =
          Number(
            raw.listingFeesMinor?.[
              typeId
            ] ??
            current.listingFeesMinor[
              typeId
            ],
          );

        const pushMinimum =
          Number(
            raw.publicPushMinimumMinor?.[
              typeId
            ] ??
            current.publicPushMinimumMinor[
              typeId
            ],
          );

        if (
          !Number.isSafeInteger(
            listingFee,
          ) ||
          listingFee < 0 ||
          listingFee >
            maximumPaymentMinor
        ) {
          throw new HttpsError(
            "invalid-argument",
            `Listing fee for ${typeId} must be between $0 and $999.`,
          );
        }

        if (
          !Number.isSafeInteger(
            pushMinimum,
          ) ||
          pushMinimum < 100 ||
          pushMinimum >
            maximumPaymentMinor
        ) {
          throw new HttpsError(
            "invalid-argument",
            `Public Push minimum for ${typeId} must be between $1 and $999.`,
          );
        }

        listingFeesMinor[
          typeId
        ] = listingFee;

        publicPushMinimumMinor[
          typeId
        ] = pushMinimum;
      }

      const boardActivationFeeMinor =
        Number(
          raw.boardActivationFeeMinor ??
          current.boardActivationFeeMinor,
        );

      const boardEntryMinimumMinor =
        Number(
          raw.boardEntryMinimumMinor ??
          current.boardEntryMinimumMinor,
        );

      const boardPushMinimumMinor =
        Number(
          raw.boardPushMinimumMinor ??
          current.boardPushMinimumMinor,
        );

      for (
        const [
          label,
          value,
        ]
        of [
          [
            "Board activation fee",
            boardActivationFeeMinor,
          ],
          [
            "Board Entry minimum",
            boardEntryMinimumMinor,
          ],
          [
            "Board Push minimum",
            boardPushMinimumMinor,
          ],
        ] as const
      ) {
        if (
          !Number.isSafeInteger(
            value,
          ) ||
          value < 100 ||
          value >
            maximumPaymentMinor
        ) {
          throw new HttpsError(
            "invalid-argument",
            `${label} must be between $1 and $999.`,
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
        currency:
          "USD" as const,
      };

      await db
        .collection(
          "marketplaceConfig",
        )
        .doc("pricing")
        .set(
          {
            ...pricing,
            updatedByAdminUserId:
              request.auth.uid,
            updatedAt:
              FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          },
        );

      return {
        success: true,
        pricing,
      };
    },
  );

/* END VIEWBID MARKETPLACE PRICING CONFIG V2 */

/* BEGIN VIEWBID LISTING SUBMISSION PREP V1 */

export const prepareListingSubmission =
  onCall(
    {
      region: "asia-south1",
    },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Authentication required.",
        );
      }

      const listingId =
        normalizeString(
          request.data?.listingId,
        );

      if (!listingId) {
        throw new HttpsError(
          "invalid-argument",
          "listingId is required.",
        );
      }

      const listingRef =
        db
          .collection("listings")
          .doc(listingId);

      return db.runTransaction(
        async (transaction) => {
          const listingSnap =
            await transaction.get(
              listingRef,
            );

          if (!listingSnap.exists) {
            throw new HttpsError(
              "not-found",
              "Listing not found.",
            );
          }

          const listing =
            listingSnap.data();

          if (
            normalizeString(
              listing?.submittedByUserId,
            ) !== request.auth!.uid
          ) {
            throw new HttpsError(
              "permission-denied",
              "You can only submit a Listing from your account.",
            );
          }

          const status =
            normalizeString(
              listing?.status,
            );

          if (
            [
              "submitted",
              "under_review",
              "published",
            ].includes(status)
          ) {
            return {
              success: true,
              listingId,
              status,
              paymentRequired:
                false,
              amountMinor:
                0,
              currency:
                "USD",
            };
          }

          if (
            status !==
            "payment_pending"
          ) {
            throw new HttpsError(
              "failed-precondition",
              "This Listing cannot be submitted from its current status.",
            );
          }

          const pricingConfig =
            await getMarketplacePricingConfig(
              db,
            );

          const typeId =
            normalizeString(
              listing?.listingTypeId,
            );

          const feeMinor =
            Number(
              pricingConfig
                .listingFeesMinor[
                  typeId
                ],
            );

          if (
            !Number.isSafeInteger(
              feeMinor,
            )
          ) {
            throw new HttpsError(
              "failed-precondition",
              "Listing Type pricing is not configured.",
            );
          }

          const now =
            FieldValue.serverTimestamp();

          if (feeMinor <= 0) {
            transaction.update(
              listingRef,
              {
                status:
                  "submitted",
                submissionFeeMinor:
                  0,
                submissionPaymentStatus:
                  "waived",
                updatedAt:
                  now,
              },
            );

            return {
              success: true,
              listingId,
              status:
                "submitted",
              paymentRequired:
                false,
              amountMinor:
                0,
              currency:
                "USD",
            };
          }

          transaction.update(
            listingRef,
            {
              submissionFeeMinor:
                feeMinor,
              submissionPaymentStatus:
                "unpaid",
              updatedAt:
                now,
            },
          );

          return {
            success: true,
            listingId,
            status:
              "payment_pending",
            paymentRequired:
              true,
            amountMinor:
              feeMinor,
            currency:
              "USD",
          };
        },
      );
    },
  );

/* END VIEWBID LISTING SUBMISSION PREP V1 */

/* BEGIN VIEWBID CREATE BOARD ENTRY INTENT V1 */

export const createBoardEntryIntent =
  onCall(
    {
      region: "asia-south1",
    },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Authentication required.",
        );
      }

      const boardId =
        normalizeString(
          request.data?.boardId,
        );

      const listingId =
        normalizeString(
          request.data?.listingId,
        );

      if (
        !boardId ||
        !listingId
      ) {
        throw new HttpsError(
          "invalid-argument",
          "boardId and listingId are required.",
        );
      }

      const boardRef =
        db
          .collection("boards")
          .doc(boardId);

      const listingRef =
        db
          .collection("listings")
          .doc(listingId);

      const entryId =
        `${boardId}_${listingId}`;

      const entryRef =
        db
          .collection("boardEntries")
          .doc(entryId);

      const auditRef =
        db
          .collection("auditEvents")
          .doc(
            `board_entry_intent_${entryId}`,
          );

      const result =
        await db.runTransaction(
          async (transaction) => {
            const boardSnap =
              await transaction.get(
                boardRef,
              );

            const listingSnap =
              await transaction.get(
                listingRef,
              );

            const entrySnap =
              await transaction.get(
                entryRef,
              );

            if (!boardSnap.exists) {
              throw new HttpsError(
                "not-found",
                "Board not found.",
              );
            }

            if (!listingSnap.exists) {
              throw new HttpsError(
                "not-found",
                "Listing not found.",
              );
            }

            const board =
              boardSnap.data();

            const listing =
              listingSnap.data();

            if (!board || !listing) {
              throw new HttpsError(
                "not-found",
                "Board or Listing data not found.",
              );
            }

            if (
              ![
                "approved",
                "entry_open",
                "active",
              ].includes(
                String(board.status),
              )
            ) {
              throw new HttpsError(
                "failed-precondition",
                "This Board is not accepting entries.",
              );
            }

            const nowMs =
              Date.now();

            const entryStartsMs =
              new Date(
                String(
                  board.entryStartsAt,
                ),
              ).getTime();

            const entryClosesMs =
              new Date(
                String(
                  board.entryClosesAt,
                ),
              ).getTime();

            const endsMs =
              new Date(
                String(
                  board.endsAt,
                ),
              ).getTime();

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

            if (
              listing.submittedByUserId !==
              request.auth!.uid
            ) {
              throw new HttpsError(
                "permission-denied",
                "You can only enter a listing from your account.",
              );
            }

            if (
              listing.listingTypeId !==
              board.listingTypeId
            ) {
              throw new HttpsError(
                "failed-precondition",
                "This listing type is not eligible for this Board.",
              );
            }

            if (
              board.categoryId &&
              listing.categoryId !==
                board.categoryId
            ) {
              throw new HttpsError(
                "failed-precondition",
                "This listing category is not eligible for this Board.",
              );
            }

            if (
              board.subcategoryId &&
              listing.subcategoryId !==
                board.subcategoryId
            ) {
              throw new HttpsError(
                "failed-precondition",
                "This listing subcategory is not eligible for this Board.",
              );
            }

            const listingStatus =
              String(
                listing.status || "",
              );

            if (
              ![
                "payment_pending",
                "submitted",
                "under_review",
                "published",
              ].includes(
                listingStatus,
              )
            ) {
              throw new HttpsError(
                "failed-precondition",
                "This listing cannot enter the Board from its current status.",
              );
            }

            if (entrySnap.exists) {
              const existing =
                entrySnap.data();

              if (
                existing?.status ===
                "entered"
              ) {
                throw new HttpsError(
                  "already-exists",
                  "This listing is already entered in the Board.",
                );
              }

              if (
                existing?.status ===
                "pending_payment"
              ) {
                return {
                  status:
                    "pending_payment" as const,
                  paymentRequired:
                    true,
                };
              }

              if (
                existing?.status ===
                "pending_review"
              ) {
                if (
                  listingStatus ===
                  "published"
                ) {
                  transaction.update(
                    entryRef,
                    {
                      status:
                        "pending_payment",
                      updatedAt:
                        FieldValue
                          .serverTimestamp(),
                    },
                  );

                  return {
                    status:
                      "pending_payment" as const,
                    paymentRequired:
                      true,
                  };
                }

                return {
                  status:
                    "pending_review" as const,
                  paymentRequired:
                    false,
                };
              }

              throw new HttpsError(
                "failed-precondition",
                "This listing already has a Board entry record.",
              );
            }

            const initialStatus =
              listingStatus ===
              "published"
                ? "pending_payment"
                : "pending_review";

            const now =
              FieldValue
                .serverTimestamp();

            transaction.set(
              entryRef,
              {
                id:
                  entryId,

                boardId,
                boardName:
                  normalizeString(
                    board.name,
                  ),
                listingId,

                searchTokens:
                  buildSearchTokens(
                    listing.title,
                    listing.handle,
                  ),

                listingTitle:
                  normalizeString(
                    listing.title,
                  ),

                listingHandle:
                  normalizeString(
                    listing.handle,
                  ) || null,

                listingExternalUrl:
                  normalizeString(
                    listing.externalUrl,
                  ),

                listingFeaturedImageUrl:
                  normalizeString(
                    listing.featuredImageUrl,
                  ) || null,

                listingTypeId:
                  normalizeString(
                    listing.listingTypeId,
                  ),

                submittedByUserId:
                  request.auth!.uid,

                status:
                  initialStatus,

                entryFeeMinor:
                  Number(
                    board.entryFeeMinor,
                  ),

                currency:
                  String(
                    board.currency ||
                    "USD",
                  ),

                entryPaymentId:
                  null,

                boostTotalMinor:
                  0,

                supporterCount:
                  0,

                externalClicks:
                  0,

                joinedAt:
                  now,

                updatedAt:
                  now,
              },
            );

            transaction.set(
              auditRef,
              {
                id:
                  auditRef.id,

                type:
                  "board_entry_intent_created",

                boardId,
                listingId,

                boardEntryId:
                  entryId,

                actorUserId:
                  request.auth!.uid,

                createdAt:
                  now,

                metadata: {
                  status:
                    initialStatus,

                  entryFeeMinor:
                    Number(
                      board.entryFeeMinor,
                    ),

                  currency:
                    String(
                      board.currency ||
                      "USD",
                    ),
                },
              },
            );

            return {
              status:
                initialStatus,
              paymentRequired:
                initialStatus ===
                "pending_payment",
            };
          },
        );

      return {
        success:
          true,

        boardEntryId:
          entryId,

        status:
          result.status,

        paymentRequired:
          result.paymentRequired,
      };
    },
  );

/* END VIEWBID CREATE BOARD ENTRY INTENT V1 */

/* BEGIN VIEWBID GENERIC PAYMENT INTENT V1 */

export const createPaymentIntent =
  onCall(
    {
      region: "asia-south1",
    },
    async (request) => {
      const validated =
        await validatePaymentRequest(
          db,
          request.data,
          request.auth?.uid ??
            null,
        );

      const paymentRef =
        db
          .collection(
            "paymentIntents",
          )
          .doc();

      const now =
        FieldValue.serverTimestamp();

      await paymentRef.set({
        id:
          paymentRef.id,

        ...validated,

        status:
          "created",

        provider:
          "unconfigured",

        providerPaymentId:
          null,

        createdByUserId:
          request.auth?.uid ??
          null,

        createdAt:
          now,

        updatedAt:
          now,

        verifiedAt:
          null,

        fulfilledAt:
          null,
      });

      return {
        success: true,

        paymentIntentId:
          paymentRef.id,

        status:
          "created",

        providerReady:
          false,

        checkoutUrl:
          null,
      };
    },
  );

/* END VIEWBID GENERIC PAYMENT INTENT V1 */
/* BEGIN VIEWBID EMULATOR PAYMENT COMPLETION V2 */

/**
 * Local emulator helper for end-to-end payment testing.
 *
 * This callable:
 * - does not require authentication
 * - works only when FUNCTIONS_EMULATOR === "true"
 * - works only for provider === "unconfigured"
 * - uses the same fulfillVerifiedPayment() path as a real verified webhook
 *
 * It therefore cannot be used to create free paid ranking in deployed Firebase.
 */
export const completeEmulatorPayment =
  onCall(
    {
      region: "asia-south1",
    },
    async (request) => {
      if (
        process.env.FUNCTIONS_EMULATOR !==
        "true"
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Emulator payment completion is available only in the Firebase Emulator.",
        );
      }

      const paymentIntentId =
        normalizeString(
          request.data
            ?.paymentIntentId,
        );

      if (!paymentIntentId) {
        throw new HttpsError(
          "invalid-argument",
          "paymentIntentId is required.",
        );
      }

      const paymentRef =
        db
          .collection(
            "paymentIntents",
          )
          .doc(
            paymentIntentId,
          );

      const paymentSnap =
        await paymentRef.get();

      if (!paymentSnap.exists) {
        throw new HttpsError(
          "not-found",
          "Payment intent not found.",
        );
      }

      const payment =
        paymentSnap.data();

      if (
        payment?.fulfilledAt
      ) {
        return {
          success: true,
          paymentIntentId,
          status: "paid",
          alreadyFulfilled: true,
        };
      }

      if (
        payment?.provider !==
        "unconfigured"
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Emulator completion is disabled for configured payment providers.",
        );
      }

      if (
        payment?.status !==
        "created"
      ) {
        throw new HttpsError(
          "failed-precondition",
          `Payment cannot be emulator-completed from status: ${String(
            payment?.status || "",
          )}`,
        );
      }

      const providerPaymentId =
        `emulator_${paymentIntentId}`;

      await fulfillVerifiedPayment(
        db,
        paymentIntentId,
        providerPaymentId,
      );

      return {
        success: true,
        paymentIntentId,
        status: "paid",
        alreadyFulfilled: false,
      };
    },
  );

/* END VIEWBID EMULATOR PAYMENT COMPLETION V2 */


/* BEGIN VIEWBID CLICK TRACKING V1 */

export const recordExternalClick =
  onCall(
    {
      region: "asia-south1",
    },
    async (request) => {
      const targetKind =
        normalizeString(
          request.data?.targetKind,
        );

      const targetId =
        normalizeString(
          request.data?.targetId,
        );

      if (
        ![
          "listing",
          "board_entry",
        ].includes(
          targetKind,
        )
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Unsupported click target.",
        );
      }

      if (!targetId) {
        throw new HttpsError(
          "invalid-argument",
          "targetId is required.",
        );
      }

      const collectionName =
        targetKind === "listing"
          ? "listings"
          : "boardEntries";

      const targetRef =
        db
          .collection(
            collectionName,
          )
          .doc(targetId);

      const targetSnap =
        await targetRef.get();

      if (!targetSnap.exists) {
        throw new HttpsError(
          "not-found",
          "Click target not found.",
        );
      }

      await targetRef.update({
        externalClicks:
          FieldValue.increment(1),

        updatedAt:
          FieldValue.serverTimestamp(),
      });

      return {
        success: true,
      };
    },
  );

/* END VIEWBID CLICK TRACKING V1 */
