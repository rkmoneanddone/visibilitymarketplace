import {
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";

import {
  getFirestore,
} from "firebase-admin/firestore";

import {
  getRuntimeSystemConfig,
} from "./systemConfig";

function normalizeString(
  value: unknown,
) {
  return String(value ?? "").trim();
}

export const getPaymentStatus =
  onCall(
    {
      region: "asia-south1",
    },
    async (request) => {
      const paymentIntentId =
        normalizeString(
          request.data?.paymentIntentId,
        );

      const clientStatusToken =
        normalizeString(
          request.data?.clientStatusToken,
        );

      if (
        !paymentIntentId ||
        !clientStatusToken
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Payment intent and status token are required.",
        );
      }

      const db = getFirestore();

      const snap =
        await db
          .collection("paymentIntents")
          .doc(paymentIntentId)
          .get();

      if (!snap.exists) {
        throw new HttpsError(
          "not-found",
          "Payment not found.",
        );
      }

      const payment =
        snap.data();

      if (
        normalizeString(
          payment?.clientStatusToken,
        ) !== clientStatusToken
      ) {
        throw new HttpsError(
          "permission-denied",
          "Invalid payment status token.",
        );
      }

      const config =
        await getRuntimeSystemConfig();

      const status =
        normalizeString(
          payment?.status,
        );

      let message =
        "Payment is still being processed.";

      if (status === "paid") {
        message =
          config.payments.successMessage;
      } else if (
        status === "failed" ||
        status === "provider_error"
      ) {
        message =
          config.payments.failureMessage;
      } else if (
        status === "cancelled"
      ) {
        message =
          config.payments.cancelledMessage;
      }

      return {
        success: true,
        payment: {
          paymentIntentId,
          status,
          purpose:
            normalizeString(
              payment?.purpose,
            ),
          amountMinor:
            Number(
              payment?.amountMinor || 0,
            ),
          currency:
            normalizeString(
              payment?.currency ||
              config.general.currency,
            ),
          refundStatus:
            normalizeString(
              payment?.refundStatus,
            ) || null,
          fulfilled:
            Boolean(
              payment?.fulfilledAt,
            ),
          message,
        },
      };
    },
  );
