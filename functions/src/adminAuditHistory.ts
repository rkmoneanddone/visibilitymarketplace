import {
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";

import {
  getApps,
  initializeApp,
} from "firebase-admin/app";

import {
  getFirestore,
  type Timestamp,
} from "firebase-admin/firestore";

import {
  getRuntimeSystemConfig,
} from "./systemConfig";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

async function assertAdmin(uid: string) {
  const user =
    await db
      .collection("users")
      .doc(uid)
      .get();

  if (
    !user.exists ||
    user.data()?.role !== "admin"
  ) {
    throw new HttpsError(
      "permission-denied",
      "Admin access required.",
    );
  }
}

function timestampToIso(
  value: unknown,
): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as Timestamp).toDate === "function"
  ) {
    return (value as Timestamp)
      .toDate()
      .toISOString();
  }

  return null;
}

export const getAdminAuditHistory =
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

      await assertAdmin(request.auth.uid);

      const config =
        await getRuntimeSystemConfig();

      const requestedLimit =
        Number(request.data?.limit);

      const safeLimit =
        Number.isSafeInteger(requestedLimit)
          ? Math.min(
              Math.max(requestedLimit, 1),
              config.limits.dashboardPageSize,
            )
          : config.limits.dashboardPageSize;

      const snapshot =
        await db
          .collection("auditEvents")
          .orderBy("createdAt", "desc")
          .limit(safeLimit)
          .get();

      return {
        success: true,
        items:
          snapshot.docs.map((document) => {
            const data = document.data();

            return {
              id: document.id,
              type: String(data.type ?? ""),
              actorUserId:
                data.actorUserId
                  ? String(data.actorUserId)
                  : null,
              actorType:
                data.actorType
                  ? String(data.actorType)
                  : null,
              listingId:
                data.listingId
                  ? String(data.listingId)
                  : null,
              boardId:
                data.boardId
                  ? String(data.boardId)
                  : null,
              boardEntryId:
                data.boardEntryId
                  ? String(data.boardEntryId)
                  : null,
              paymentIntentId:
                data.paymentIntentId
                  ? String(data.paymentIntentId)
                  : null,
              createdAt:
                timestampToIso(data.createdAt),
              metadata:
                data.metadata &&
                typeof data.metadata === "object"
                  ? data.metadata
                  : null,
            };
          }),
      };
    },
  );
