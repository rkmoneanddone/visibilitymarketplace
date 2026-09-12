import {
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";

import {
  getApps,
  initializeApp,
} from "firebase-admin/app";

import {
  FieldValue,
  getFirestore,
  type DocumentData,
} from "firebase-admin/firestore";

import {
  resendApiKey,
  sendConfiguredEmail,
  type EmailTemplateKey,
} from "./mailer";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

type PaymentEmailEvent = {
  templateKey: EmailTemplateKey;
  eventKey: string;
};

function normalizeString(
  value: unknown,
): string {
  return String(value ?? "").trim();
}

function getEmailEvent(
  before: DocumentData,
  after: DocumentData,
): PaymentEmailEvent | null {
  const beforeStatus =
    normalizeString(before.status);
  const afterStatus =
    normalizeString(after.status);

  if (
    afterStatus === "paid" &&
    beforeStatus !== "paid"
  ) {
    return {
      templateKey: "paymentSuccess",
      eventKey: "paid",
    };
  }

  if (
    afterStatus === "failed" &&
    beforeStatus !== "failed"
  ) {
    return {
      templateKey: "paymentFailed",
      eventKey: "failed",
    };
  }

  if (
    afterStatus === "cancelled" &&
    beforeStatus !== "cancelled"
  ) {
    return {
      templateKey: "paymentCancelled",
      eventKey: "cancelled",
    };
  }

  const beforeRefund =
    normalizeString(before.refundStatus);
  const afterRefund =
    normalizeString(after.refundStatus);

  if (
    afterRefund === "succeeded" &&
    beforeRefund !== "succeeded"
  ) {
    return {
      templateKey: "paymentRefunded",
      eventKey: "refunded",
    };
  }

  return null;
}

async function resolveRecipientEmail(
  payment: DocumentData,
): Promise<string | null> {
  const storedEmail =
    normalizeString(
      payment.customerEmail ||
      payment.payerEmail,
    ).toLowerCase();

  if (storedEmail) {
    return storedEmail;
  }

  const userId =
    normalizeString(
      payment.createdByUserId,
    );

  if (!userId) {
    return null;
  }

  const userSnap =
    await db
      .collection("users")
      .doc(userId)
      .get();

  if (!userSnap.exists) {
    return null;
  }

  return normalizeString(
    userSnap.data()?.email,
  ).toLowerCase() || null;
}

function moneyVariables(
  payment: DocumentData,
) {
  const amountMinor =
    Number(payment.amountMinor);

  const amount =
    Number.isSafeInteger(amountMinor)
      ? (amountMinor / 100).toFixed(2)
      : "";

  return {
    paymentIntentId:
      normalizeString(payment.id),
    paymentId:
      normalizeString(
        payment.providerPaymentId,
      ),
    purpose:
      normalizeString(payment.purpose),
    targetId:
      normalizeString(payment.targetId),
    amount,
    amountMinor:
      Number.isSafeInteger(amountMinor)
        ? amountMinor
        : "",
    currency:
      normalizeString(payment.currency),
    description:
      normalizeString(payment.description),
  };
}

export const sendPaymentStatusEmail =
  onDocumentUpdated(
    {
      document:
        "paymentIntents/{paymentIntentId}",
      region: "asia-south1",
      secrets: [resendApiKey],
      retry: false,
    },
    async (event) => {
      const before =
        event.data?.before.data();
      const after =
        event.data?.after.data();

      if (!before || !after) {
        return;
      }

      const emailEvent =
        getEmailEvent(
          before,
          after,
        );

      if (!emailEvent) {
        return;
      }

      const paymentIntentId =
        event.params.paymentIntentId;

      const eventId =
        `${paymentIntentId}_${emailEvent.eventKey}`;

      const eventRef =
        db
          .collection("paymentEmailEvents")
          .doc(eventId);

      const shouldSend =
        await db.runTransaction(
          async (transaction) => {
            const existing =
              await transaction.get(
                eventRef,
              );

            if (existing.exists) {
              return false;
            }

            transaction.create(
              eventRef,
              {
                id: eventId,
                paymentIntentId,
                templateKey:
                  emailEvent.templateKey,
                eventKey:
                  emailEvent.eventKey,
                status: "pending",
                createdAt:
                  FieldValue.serverTimestamp(),
                updatedAt:
                  FieldValue.serverTimestamp(),
              },
            );

            return true;
          },
        );

      if (!shouldSend) {
        return;
      }

      try {
        const recipient =
          await resolveRecipientEmail(
            after,
          );

        const result =
          await sendConfiguredEmail({
            to: recipient,
            templateKey:
              emailEvent.templateKey,
            variables:
              moneyVariables(after),
          });

        await eventRef.set(
          {
            status:
              result.sent
                ? "sent"
                : "skipped",
            recipient:
              recipient || null,
            providerMessageId:
              result.providerMessageId ||
              null,
            skippedReason:
              result.skippedReason || null,
            completedAt:
              FieldValue.serverTimestamp(),
            updatedAt:
              FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          },
        );
      } catch (error) {
        console.error(
          "Payment email delivery failed",
          {
            paymentIntentId,
            templateKey:
              emailEvent.templateKey,
            error,
          },
        );

        await eventRef.set(
          {
            status: "failed",
            error:
              String(
                error instanceof Error
                  ? error.message
                  : error,
              ).slice(0, 500),
            completedAt:
              FieldValue.serverTimestamp(),
            updatedAt:
              FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          },
        );
      }
    },
  );
