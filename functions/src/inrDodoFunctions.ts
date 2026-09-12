import {
  randomUUID,
} from "node:crypto";

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
  onRequest,
} from "firebase-functions/v2/https";

import {
  createAdaptiveDodoCheckout,
  previewDodoLocalizedPrice,
} from "./adaptiveDodoProvider";

import {
  dodoApiKey,
  dodoWebhookKey,
  getDodoPaymentData,
  verifyDodoWebhookSignature,
  type DodoWebhookPayload,
} from "./dodoProvider";

import {
  fulfillVerifiedPayment,
  getMarketplacePricingConfig,
  validatePaymentRequest,
} from "./inrPaymentCore";

import {
  reverseVerifiedPaymentForRefund,
} from "./paymentReversal";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

function normalizeString(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeEmail(value: unknown): string | null {
  const email = normalizeString(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}

function customerEmailFromPaymentData(
  paymentData: Record<string, unknown>,
): string | null {
  const customer = paymentData.customer && typeof paymentData.customer === "object"
    ? paymentData.customer as Record<string, unknown>
    : {};
  const billing = paymentData.billing && typeof paymentData.billing === "object"
    ? paymentData.billing as Record<string, unknown>
    : {};

  return (
    normalizeEmail(customer.email) ||
    normalizeEmail(billing.email) ||
    normalizeEmail(paymentData.email)
  );
}

function safeInteger(value: unknown): number | null {
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

export const previewLocalizedPrice = onCall(
  {
    region: "asia-south1",
    secrets: [dodoApiKey],
  },
  async (request) => {
    const amountMinor = Number(request.data?.amountMinor);
    const country = normalizeString(request.data?.country).toUpperCase();
    const currency = normalizeString(request.data?.currency || "INR").toUpperCase();
    const pricing = await getMarketplacePricingConfig(db);

    if (currency !== "INR") {
      throw new HttpsError(
        "invalid-argument",
        "Localized preview requires an INR base amount.",
      );
    }

    if (
      !Number.isSafeInteger(amountMinor) ||
      amountMinor < 10_000 ||
      amountMinor > pricing.maximumPaymentMinor
    ) {
      throw new HttpsError("invalid-argument", "Invalid preview amount.");
    }

    if (!/^[A-Z]{2}$/.test(country)) {
      throw new HttpsError("invalid-argument", "Invalid country.");
    }

    try {
      const preview = await previewDodoLocalizedPrice(amountMinor, country);

      return {
        success: true,
        baseAmountMinor: amountMinor,
        baseCurrency: "INR" as const,
        ...preview,
      };
    } catch (error) {
      console.warn("Dodo localized preview failed", {
        country,
        amountMinor,
        error,
      });

      throw new HttpsError(
        "unavailable",
        "Localized price preview is temporarily unavailable.",
      );
    }
  },
);

export const createDodoPaymentIntent = onCall(
  {
    region: "asia-south1",
    secrets: [dodoApiKey],
  },
  async (request) => {
    const validated = await validatePaymentRequest(
      db,
      request.data,
      request.auth?.uid ?? null,
    );

    const paymentRef = db.collection("paymentIntents").doc();
    const clientStatusToken = randomUUID();
    const authenticatedEmail = normalizeEmail(request.auth?.token.email);
    const now = FieldValue.serverTimestamp();

    await paymentRef.set({
      id: paymentRef.id,
      ...validated,
      baseAmountMinor: validated.amountMinor,
      baseCurrency: "INR",
      status: "creating_checkout",
      provider: "dodo",
      providerPaymentId: null,
      providerCheckoutSessionId: null,
      checkoutUrl: null,
      clientStatusToken,
      customerEmail: authenticatedEmail,
      createdByUserId: request.auth?.uid ?? null,
      createdAt: now,
      updatedAt: now,
      verifiedAt: null,
      fulfilledAt: null,
    });

    try {
      const checkout = await createAdaptiveDodoCheckout({
        paymentIntentId: paymentRef.id,
        clientStatusToken,
        purpose: validated.purpose,
        targetKind: validated.targetKind,
        targetId: validated.targetId,
        amountMinor: validated.amountMinor,
        currency: validated.currency,
      });

      await paymentRef.update({
        status: "checkout_ready",
        providerCheckoutSessionId: checkout.sessionId,
        checkoutUrl: checkout.checkoutUrl,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        paymentIntentId: paymentRef.id,
        status: "checkout_ready",
        providerReady: true,
        checkoutUrl: checkout.checkoutUrl,
      };
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Unable to create Dodo checkout.";

      await paymentRef.update({
        status: "provider_error",
        providerError: message.slice(0, 500),
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.error("Dodo checkout creation failed", {
        paymentIntentId: paymentRef.id,
        error,
      });

      throw new HttpsError(
        "unavailable",
        "Unable to create payment checkout right now.",
      );
    }
  },
);

export const dodoWebhook = onRequest(
  {
    region: "asia-south1",
    secrets: [dodoWebhookKey],
    cors: false,
  },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).send("Method not allowed");
      return;
    }

    const rawBody = request.rawBody;
    const webhookId = normalizeString(request.get("webhook-id"));
    const webhookTimestamp = normalizeString(request.get("webhook-timestamp"));
    const webhookSignature = normalizeString(request.get("webhook-signature"));

    if (!verifyDodoWebhookSignature(
      rawBody,
      webhookId,
      webhookTimestamp,
      webhookSignature,
    )) {
      console.warn("Rejected Dodo webhook with invalid signature", { webhookId });
      response.status(401).send("Invalid signature");
      return;
    }

    let payload: DodoWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString("utf8")) as DodoWebhookPayload;
    } catch {
      response.status(400).send("Invalid JSON");
      return;
    }

    const eventType = normalizeString(payload.type);
    const paymentData = getDodoPaymentData(payload);
    const metadata = paymentData.metadata && typeof paymentData.metadata === "object"
      ? paymentData.metadata as Record<string, unknown>
      : {};

    const paymentIntentId = normalizeString(metadata.viewbid_payment_intent_id);
    const providerPaymentId = normalizeString(
      paymentData.payment_id || paymentData.id,
    );
    const webhookCustomerEmail = customerEmailFromPaymentData(paymentData);

    if (!paymentIntentId) {
      console.warn("Ignoring Dodo webhook without ViewBid payment metadata", {
        webhookId,
        eventType,
      });
      response.status(200).send("OK");
      return;
    }

    const paymentRef = db.collection("paymentIntents").doc(paymentIntentId);
    const paymentSnap = await paymentRef.get();

    if (!paymentSnap.exists) {
      console.error("Dodo webhook references missing ViewBid payment intent", {
        paymentIntentId,
        eventType,
      });
      response.status(404).send("Payment intent not found");
      return;
    }

    const payment = paymentSnap.data();
    if (normalizeString(payment?.provider) !== "dodo") {
      response.status(409).send("Provider mismatch");
      return;
    }

    const webhookEventRef = db
      .collection("paymentWebhookEvents")
      .doc(
        webhookId ||
        `${paymentIntentId}_${eventType}_${providerPaymentId || "unknown"}`,
      );

    await webhookEventRef.set(
      {
        id: webhookEventRef.id,
        provider: "dodo",
        eventType,
        paymentIntentId,
        providerPaymentId: providerPaymentId || null,
        receivedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    try {
      if (
        webhookCustomerEmail &&
        normalizeEmail(payment?.customerEmail) !== webhookCustomerEmail
      ) {
        await paymentRef.set(
          {
            customerEmail: webhookCustomerEmail,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      if (eventType === "payment.succeeded") {
        if (!providerPaymentId) {
          throw new Error(
            "Successful Dodo payment webhook is missing payment_id.",
          );
        }

        const billingGrossMinor = safeInteger(
          paymentData.total_amount ?? paymentData.amount,
        );
        const billingTaxMinor = safeInteger(paymentData.tax ?? 0);
        const billingCurrency = normalizeString(paymentData.currency).toUpperCase();

        const hasSettlement =
          paymentData.settlement_amount !== undefined &&
          normalizeString(paymentData.settlement_currency) !== "";

        const settlementGrossMinor = hasSettlement
          ? safeInteger(paymentData.settlement_amount)
          : billingGrossMinor;
        const settlementTaxMinor = hasSettlement
          ? safeInteger(paymentData.settlement_tax ?? 0)
          : billingTaxMinor;
        const settlementCurrency = hasSettlement
          ? normalizeString(paymentData.settlement_currency).toUpperCase()
          : billingCurrency;

        const expectedAmountMinor = Number(payment?.amountMinor);
        const expectedCurrency = normalizeString(payment?.currency).toUpperCase();

        if (
          settlementGrossMinor === null ||
          settlementTaxMinor === null ||
          settlementTaxMinor < 0
        ) {
          throw new Error("Dodo settlement amounts are invalid.");
        }

        const settlementServiceMinor = settlementGrossMinor - settlementTaxMinor;

        if (
          settlementServiceMinor < 0 ||
          settlementServiceMinor !== expectedAmountMinor
        ) {
          throw new Error(
            "Dodo settlement pre-tax amount does not match the ViewBid INR payment intent.",
          );
        }

        if (!settlementCurrency || settlementCurrency !== expectedCurrency) {
          throw new Error(
            "Dodo settlement currency does not match the ViewBid INR payment intent.",
          );
        }

        await paymentRef.set(
          {
            billingAmountMinor: billingGrossMinor,
            billingTaxMinor,
            billingCurrency: billingCurrency || null,
            settlementAmountMinor: settlementGrossMinor,
            settlementTaxMinor,
            settlementCurrency,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        await fulfillVerifiedPayment(
          db,
          paymentIntentId,
          providerPaymentId,
        );

        await webhookEventRef.set(
          {
            processedAt: FieldValue.serverTimestamp(),
            processingStatus: "fulfilled",
          },
          { merge: true },
        );
      } else if (["payment.failed", "payment.cancelled"].includes(eventType)) {
        if (!payment?.fulfilledAt) {
          await paymentRef.update({
            status: eventType === "payment.failed" ? "failed" : "cancelled",
            providerPaymentId:
              providerPaymentId || payment?.providerPaymentId || null,
            ...(webhookCustomerEmail
              ? { customerEmail: webhookCustomerEmail }
              : {}),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        await webhookEventRef.set(
          {
            processedAt: FieldValue.serverTimestamp(),
            processingStatus: "recorded",
          },
          { merge: true },
        );
      } else if (eventType === "payment.processing") {
        if (!payment?.fulfilledAt) {
          await paymentRef.update({
            status: "processing",
            providerPaymentId:
              providerPaymentId || payment?.providerPaymentId || null,
            ...(webhookCustomerEmail
              ? { customerEmail: webhookCustomerEmail }
              : {}),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      } else if (eventType === "refund.succeeded") {
        const providerRefundId = normalizeString(
          paymentData.refund_id || paymentData.id,
        );

        const reversal = await reverseVerifiedPaymentForRefund(
          db,
          paymentIntentId,
          providerRefundId || undefined,
        );

        await webhookEventRef.set(
          {
            processedAt: FieldValue.serverTimestamp(),
            processingStatus: reversal.rankingReversed
              ? "refunded_and_reversed"
              : "refund_recorded",
          },
          { merge: true },
        );
      } else if (eventType === "refund.failed") {
        await paymentRef.set(
          {
            refundStatus: "failed",
            refundUpdatedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        await webhookEventRef.set(
          {
            processedAt: FieldValue.serverTimestamp(),
            processingStatus: "refund_failed",
          },
          { merge: true },
        );
      }

      response.status(200).send("OK");
    } catch (error) {
      console.error("Dodo webhook processing failed", {
        eventType,
        paymentIntentId,
        providerPaymentId,
        error,
      });

      await webhookEventRef.set(
        {
          processingStatus: "error",
          processingError: String(
            error instanceof Error ? error.message : error,
          ).slice(0, 500),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      response.status(500).send("Webhook processing failed");
    }
  },
);
