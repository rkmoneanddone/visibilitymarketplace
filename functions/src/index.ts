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

function canManageListing(
  listing: FirebaseFirestore.DocumentData,
  uid: string,
): boolean {
  if (
    listing.claimedOwnerUserId === uid
  ) {
    return true;
  }

  if (
    listing.submittedByUserId === uid &&
    listing.ownershipStatus !== "verified"
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

      const shortDescription =
        normalizeString(
          request.data?.shortDescription,
        );

      const startsAt =
        normalizeString(
          request.data?.startsAt,
        );

      const entryClosesAt =
        normalizeString(
          request.data?.entryClosesAt,
        );

      const endsAt =
        normalizeString(
          request.data?.endsAt,
        );

      const currency =
        normalizeString(
          request.data?.currency ||
          "USD",
        ).toUpperCase();

      const eligibleListingTypeIds =
        Array.isArray(
          request.data
            ?.eligibleListingTypeIds,
        )
          ? request.data
            .eligibleListingTypeIds
            .map((value: unknown) =>
              normalizeString(value),
            )
            .filter(Boolean)
          : [];

      const categoryId =
        normalizeString(
          request.data?.categoryId,
        );

      const subcategoryId =
        normalizeString(
          request.data?.subcategoryId,
        );

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

      if (!name) {
        throw new HttpsError(
          "invalid-argument",
          "Board name is required.",
        );
      }

      if (!shortDescription) {
        throw new HttpsError(
          "invalid-argument",
          "Short description is required.",
        );
      }

      if (
        eligibleListingTypeIds
          .length === 0
      ) {
        throw new HttpsError(
          "invalid-argument",
          "At least one eligible listing type is required.",
        );
      }

      if (
        !Number.isInteger(
          entryFeeMinor,
        ) ||
        entryFeeMinor < 100
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Entry fee must be at least $1.",
        );
      }

      if (
        !Number.isInteger(
          minimumBoostMinor,
        ) ||
        minimumBoostMinor < 1 ||
        minimumBoostMinor > 10000
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Minimum boost amount is invalid.",
        );
      }

      if (
        !startsAt ||
        !entryClosesAt ||
        !endsAt
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Board dates are required.",
        );
      }

      const startsDate =
        new Date(startsAt);

      const entryClosesDate =
        new Date(entryClosesAt);

      const endsDate =
        new Date(endsAt);

      if (
        Number.isNaN(
          startsDate.getTime(),
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
        entryClosesDate.getTime() <
        startsDate.getTime() ||
        endsDate.getTime() <=
        startsDate.getTime()
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Board dates are not valid.",
        );
      }

      const boardRef =
        db
          .collection("boards")
          .doc();

      const auditRef =
        db
          .collection("auditEvents")
          .doc(
            `board_requested_${boardRef.id}`,
          );

      await db.runTransaction(
        async (transaction) => {
          const now =
            FieldValue.serverTimestamp();

          transaction.set(
            boardRef,
            {
              id: boardRef.id,

              name,

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

              shortDescription,

              createdByUserId:
                request.auth!.uid,

              status:
                "requested",

              eligibleListingTypeIds,

              ...(categoryId
                ? { categoryId }
                : {}),

              ...(subcategoryId
                ? { subcategoryId }
                : {}),

              startsAt,
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

              metadata: {},
            },
          );
        },
      );

      return {
        success: true,
        boardId: boardRef.id,
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
              status: "approved",

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