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