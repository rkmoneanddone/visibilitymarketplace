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

export const getMyPaymentHistory =
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
          .collection("paymentIntents")
          .where(
            "createdByUserId",
            "==",
            request.auth.uid,
          )
          .orderBy(
            "createdAt",
            "desc",
          )
          .limit(safeLimit)
          .get();

      const items =
        snapshot.docs.map((document) => {
          const data = document.data();

          return {
            id: document.id,
            purpose:
              String(data.purpose ?? ""),
            targetKind:
              String(data.targetKind ?? ""),
            targetId:
              String(data.targetId ?? ""),
            description:
              String(data.description ?? ""),
            amountMinor:
              Number(data.amountMinor ?? 0),
            currency:
              String(data.currency ?? "USD"),
            status:
              String(data.status ?? ""),
            refundStatus:
              data.refundStatus
                ? String(data.refundStatus)
                : null,
            provider:
              String(data.provider ?? ""),
            providerPaymentId:
              data.providerPaymentId
                ? String(data.providerPaymentId)
                : null,
            createdAt:
              timestampToIso(data.createdAt),
            verifiedAt:
              timestampToIso(data.verifiedAt),
            fulfilledAt:
              timestampToIso(data.fulfilledAt),
          };
        });

      return {
        success: true,
        items,
      };
    },
  );
