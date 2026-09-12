import {
  onCall,
  onRequest,
  HttpsError,
} from "firebase-functions/v2/https";

import {
  getFirestore,
  FieldValue,
} from "firebase-admin/firestore";

import {
  createDodoCheckout,
  dodoApiKey,
  dodoWebhookKey,
  getDodoPaymentData,
  verifyDodoWebhookSignature,
  type DodoWebhookPayload,
} from "./dodoProvider";

import {
  fulfillVerifiedPayment,
  validatePaymentRequest,
} from "./paymentCore";

const db = getFirestore();

function normalizeString(
  value: unknown,
): string {
  return String(value ?? "").trim();
}

export const createDodoPaymentIntent =
  onCall(
    {
      region: "asia-south1",
      secrets: [dodoApiKey],
    },
    async (request) => {
      const validated =
        await validatePaymentRequest(
          db,
          request.data,
          request.auth?.uid ?? null,
        );

      const paymentRef =
        db
          .collection("paymentIntents")
          .doc();

      const now =
        FieldValue.serverTimestamp();

      await paymentRef.set({
        id: paymentRef.id,
        ...validated,
        status: "creating_checkout",
        provider: "dodo",
        providerPaymentId: null,
        providerCheckoutSessionId: null,
        checkoutUrl: null,
        createdByUserId:
          request.auth?.uid ?? null,
        createdAt: now,
        updatedAt: now,
        verifiedAt: null,
        fulfilledAt: null,
      });

      try {
        const checkout =
          await createDodoCheckout({
            paymentIntentId:
              paymentRef.id,
            purpose:
              validated.purpose,
            targetKind:
              validated.targetKind,
            targetId:
              validated.targetId,
            amountMinor:
              validated.amountMinor,
            currency:
              validated.currency,
          });

        await paymentRef.update({
          status: "checkout_ready",
          providerCheckoutSessionId:
            checkout.sessionId,
          checkoutUrl:
            checkout.checkoutUrl,
          updatedAt:
            FieldValue.serverTimestamp(),
        });

        return {
          success: true,
          paymentIntentId:
            paymentRef.id,
          status: "checkout_ready",
          providerReady: true,
          checkoutUrl:
            checkout.checkoutUrl,
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to create Dodo checkout.";

        await paymentRef.update({
          status: "provider_error",
          providerError:
            message.slice(0, 500),
          updatedAt:
            FieldValue.serverTimestamp(),
        });

        console.error(
          "Dodo checkout creation failed",
          {
            paymentIntentId:
              paymentRef.id,
            error,
          },
        );

        throw new HttpsError(
          "unavailable",
          "Unable to create payment checkout right now.",
        );
      }
    },
  );

export const dodoWebhook =
  onRequest(
    {
      region: "asia-south1",
      secrets: [dodoWebhookKey],
      cors: false,
    },
    async (request, response) => {
      if (request.method !== "POST") {
        response
          .status(405)
          .send("Method not allowed");
        return;
      }

      const rawBody =
        request.rawBody;

      const webhookId =
        normalizeString(
          request.get("webhook-id"),
        );

      const webhookTimestamp =
        normalizeString(
          request.get(
            "webhook-timestamp",
          ),
        );

      const webhookSignature =
        normalizeString(
          request.get(
            "webhook-signature",
          ),
        );

      if (
        !verifyDodoWebhookSignature(
          rawBody,
          webhookId,
          webhookTimestamp,
          webhookSignature,
        )
      ) {
        console.warn(
          "Rejected Dodo webhook with invalid signature",
          {
            webhookId,
          },
        );

        response
          .status(401)
          .send("Invalid signature");
        return;
      }

      let payload:
        DodoWebhookPayload;

      try {
        payload =
          JSON.parse(
            rawBody.toString("utf8"),
          ) as DodoWebhookPayload;
      } catch {
        response
          .status(400)
          .send("Invalid JSON");
        return;
      }

      const eventType =
        normalizeString(
          payload.type,
        );

      const paymentData =
        getDodoPaymentData(
          payload,
        );

      const metadata =
        paymentData.metadata &&
        typeof paymentData.metadata ===
          "object"
          ? paymentData.metadata as
              Record<string, unknown>
          : {};

      const paymentIntentId =
        normalizeString(
          metadata
            .viewbid_payment_intent_id,
        );

      const providerPaymentId =
        normalizeString(
          paymentData.payment_id ||
          paymentData.id,
        );

      if (!paymentIntentId) {
        console.warn(
          "Ignoring Dodo webhook without ViewBid payment metadata",
          {
            webhookId,
            eventType,
          },
        );

        response.status(200).send("OK");
        return;
      }

      const paymentRef =
        db
          .collection("paymentIntents")
          .doc(paymentIntentId);

      const paymentSnap =
        await paymentRef.get();

      if (!paymentSnap.exists) {
        console.error(
          "Dodo webhook references missing ViewBid payment intent",
          {
            paymentIntentId,
            eventType,
          },
        );

        response
          .status(404)
          .send("Payment intent not found");
        return;
      }

      const payment =
        paymentSnap.data();

      if (
        normalizeString(
          payment?.provider,
        ) !== "dodo"
      ) {
        response
          .status(409)
          .send("Provider mismatch");
        return;
      }

      const webhookEventRef =
        db
          .collection(
            "paymentWebhookEvents",
          )
          .doc(
            webhookId ||
              `${paymentIntentId}_${eventType}_${providerPaymentId || "unknown"}`,
          );

      await webhookEventRef.set(
        {
          id:
            webhookEventRef.id,
          provider: "dodo",
          eventType,
          paymentIntentId,
          providerPaymentId:
            providerPaymentId || null,
          receivedAt:
            FieldValue.serverTimestamp(),
        },
        {
          merge: true,
        },
      );

      try {
        if (
          eventType ===
          "payment.succeeded"
        ) {
          if (!providerPaymentId) {
            throw new Error(
              "Successful Dodo payment webhook is missing payment_id.",
            );
          }

          const webhookGrossAmountMinor =
            Number(
              paymentData.total_amount ??
              paymentData.amount,
            );

          const webhookTaxMinor =
            Number(
              paymentData.tax ?? 0,
            );

          const webhookServiceAmountMinor =
            webhookGrossAmountMinor -
            webhookTaxMinor;

          const webhookCurrency =
            normalizeString(
              paymentData.currency,
            ).toUpperCase();

          const expectedAmountMinor =
            Number(
              payment?.amountMinor,
            );

          const expectedCurrency =
            normalizeString(
              payment?.currency,
            ).toUpperCase();

          if (
            !Number.isSafeInteger(
              webhookGrossAmountMinor,
            ) ||
            !Number.isSafeInteger(
              webhookTaxMinor,
            ) ||
            !Number.isSafeInteger(
              webhookServiceAmountMinor,
            ) ||
            webhookServiceAmountMinor !==
              expectedAmountMinor
          ) {
            throw new Error(
              "Dodo payment pre-tax amount does not match the ViewBid payment intent.",
            );
          }

          if (
            !webhookCurrency ||
            webhookCurrency !==
              expectedCurrency
          ) {
            throw new Error(
              "Dodo payment currency does not match the ViewBid payment intent.",
            );
          }

          await fulfillVerifiedPayment(
            db,
            paymentIntentId,
            providerPaymentId,
          );

          await webhookEventRef.set(
            {
              processedAt:
                FieldValue.serverTimestamp(),
              processingStatus:
                "fulfilled",
            },
            {
              merge: true,
            },
          );
        } else if (
          [
            "payment.failed",
            "payment.cancelled",
          ].includes(eventType)
        ) {
          if (!payment?.fulfilledAt) {
            await paymentRef.update({
              status:
                eventType ===
                  "payment.failed"
                  ? "failed"
                  : "cancelled",
              providerPaymentId:
                providerPaymentId ||
                payment
                  ?.providerPaymentId ||
                null,
              updatedAt:
                FieldValue.serverTimestamp(),
            });
          }

          await webhookEventRef.set(
            {
              processedAt:
                FieldValue.serverTimestamp(),
              processingStatus:
                "recorded",
            },
            {
              merge: true,
            },
          );
        } else if (
          eventType ===
          "payment.processing"
        ) {
          if (!payment?.fulfilledAt) {
            await paymentRef.update({
              status: "processing",
              providerPaymentId:
                providerPaymentId ||
                payment
                  ?.providerPaymentId ||
                null,
              updatedAt:
                FieldValue.serverTimestamp(),
            });
          }
        } else if (
          eventType ===
          "refund.succeeded"
        ) {
          await paymentRef.set(
            {
              refundStatus:
                "succeeded",
              refundUpdatedAt:
                FieldValue.serverTimestamp(),
              updatedAt:
                FieldValue.serverTimestamp(),
            },
            {
              merge: true,
            },
          );
        } else if (
          eventType ===
          "refund.failed"
        ) {
          await paymentRef.set(
            {
              refundStatus:
                "failed",
              refundUpdatedAt:
                FieldValue.serverTimestamp(),
              updatedAt:
                FieldValue.serverTimestamp(),
            },
            {
              merge: true,
            },
          );
        }

        response.status(200).send("OK");
      } catch (error) {
        console.error(
          "Dodo webhook processing failed",
          {
            eventType,
            paymentIntentId,
            providerPaymentId,
            error,
          },
        );

        await webhookEventRef.set(
          {
            processingStatus:
              "error",
            processingError:
              String(
                error instanceof Error
                  ? error.message
                  : error,
              ).slice(0, 500),
            updatedAt:
              FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          },
        );

        response
          .status(500)
          .send("Webhook processing failed");
      }
    },
  );
