import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import {
  defineSecret,
  defineString,
} from "firebase-functions/params";

import {
  getRuntimeSystemConfig,
} from "./systemConfig";

export const dodoApiKey =
  defineSecret("DODO_API_KEY");

export const dodoWebhookKey =
  defineSecret("DODO_WEBHOOK_KEY");

export const dodoApiBaseUrl =
  defineString(
    "DODO_API_BASE_URL",
    {
      default: "",
      description:
        "Optional Dodo API base URL override for infrastructure testing only.",
    },
  );

type DodoCheckoutInput = {
  paymentIntentId: string;
  clientStatusToken: string;
  purpose: string;
  targetKind: string;
  targetId: string;
  amountMinor: number;
  currency: string;
};

type DodoCheckoutResult = {
  sessionId: string;
  checkoutUrl: string;
};

function resolveApiBaseUrl(
  environment:
    | "test_mode"
    | "live_mode",
) {
  const override =
    dodoApiBaseUrl.value().trim();

  if (override) {
    return override.replace(/\/$/, "");
  }

  return environment === "live_mode"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";
}

export async function createDodoCheckout(
  input: DodoCheckoutInput,
): Promise<DodoCheckoutResult> {
  const apiKey =
    dodoApiKey.value().trim();

  if (!apiKey) {
    throw new Error(
      "DODO_API_KEY is not configured.",
    );
  }

  const config =
    await getRuntimeSystemConfig();

  if (!config.payments.enabled) {
    throw new Error(
      "ViewBid payments are currently disabled by system configuration.",
    );
  }

  const productId =
    config.payments.dodoProductId.trim();

  if (!productId) {
    throw new Error(
      "Dodo Product ID is not configured.",
    );
  }

  if (
    !Number.isSafeInteger(
      input.amountMinor,
    ) ||
    input.amountMinor < 100
  ) {
    throw new Error(
      "Dodo checkout amount must be at least $1.00 in minor units.",
    );
  }

  const currency =
    input.currency
      .trim()
      .toUpperCase();

  if (
    currency !==
    config.general.currency
  ) {
    throw new Error(
      `ViewBid checkout currently supports ${config.general.currency} only.`,
    );
  }

  const publicUrl =
    config.general.publicUrl
      .trim()
      .replace(/\/$/, "");

  const returnUrl =
    publicUrl
      ? `${publicUrl}/?payment=return&intent=${encodeURIComponent(
          input.paymentIntentId,
        )}&token=${encodeURIComponent(
          input.clientStatusToken,
        )}`
      : undefined;

  const response =
    await fetch(
      `${resolveApiBaseUrl(
        config.payments.environment,
      )}/checkouts`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          product_cart: [
            {
              product_id:
                productId,
              quantity: 1,
              amount:
                input.amountMinor,
            },
          ],
          billing_currency:
            currency,
          return_url:
            returnUrl,
          metadata: {
            viewbid_payment_intent_id:
              input.paymentIntentId,
            viewbid_payment_purpose:
              input.purpose,
            viewbid_target_kind:
              input.targetKind,
            viewbid_target_id:
              input.targetId,
            viewbid_config_version:
              String(config.version),
          },
        }),
      },
    );

  const raw =
    await response.text();

  let body: {
    session_id?: unknown;
    checkout_url?: unknown;
    message?: unknown;
  } = {};

  try {
    body =
      JSON.parse(raw) as typeof body;
  } catch {
    body = {};
  }

  if (!response.ok) {
    throw new Error(
      `Dodo checkout creation failed (${response.status}): ${String(
        body.message || raw || "Unknown error",
      ).slice(0, 500)}`,
    );
  }

  const sessionId =
    String(
      body.session_id || "",
    ).trim();

  const checkoutUrl =
    String(
      body.checkout_url || "",
    ).trim();

  if (!sessionId || !checkoutUrl) {
    throw new Error(
      "Dodo checkout response did not include session_id and checkout_url.",
    );
  }

  return {
    sessionId,
    checkoutUrl,
  };
}

function decodeWebhookSecret(
  secret: string,
) {
  if (secret.startsWith("whsec_")) {
    return Buffer.from(
      secret.slice(6),
      "base64",
    );
  }

  return Buffer.from(secret, "utf8");
}

export function verifyDodoWebhookSignature(
  rawBody: Buffer,
  webhookId: string,
  webhookTimestamp: string,
  signatureHeader: string,
) {
  const secret =
    dodoWebhookKey.value().trim();

  if (
    !secret ||
    !webhookId ||
    !webhookTimestamp ||
    !signatureHeader
  ) {
    return false;
  }

  const timestampNumber =
    Number(webhookTimestamp);

  if (!Number.isFinite(timestampNumber)) {
    return false;
  }

  const nowSeconds =
    Math.floor(Date.now() / 1000);

  if (
    timestampNumber <
      nowSeconds - 60 * 60 ||
    timestampNumber >
      nowSeconds + 5 * 60
  ) {
    return false;
  }

  const signedContent =
    `${webhookId}.${webhookTimestamp}.${rawBody.toString("utf8")}`;

  const expected =
    createHmac(
      "sha256",
      decodeWebhookSecret(secret),
    )
      .update(signedContent)
      .digest("base64");

  const candidates =
    signatureHeader
      .split(/\s+/)
      .map((part) => {
        const commaIndex =
          part.indexOf(",");

        return commaIndex >= 0
          ? part.slice(
              commaIndex + 1,
            )
          : part;
      })
      .filter(Boolean);

  return candidates.some(
    (candidate) => {
      const actualBuffer =
        Buffer.from(
          candidate,
          "utf8",
        );

      const expectedBuffer =
        Buffer.from(
          expected,
          "utf8",
        );

      return (
        actualBuffer.length ===
          expectedBuffer.length &&
        timingSafeEqual(
          actualBuffer,
          expectedBuffer,
        )
      );
    },
  );
}

export type DodoWebhookPayload = {
  type?: string;
  data?: Record<string, unknown>;
  business_id?: string;
  timestamp?: string;
};

export function getDodoPaymentData(
  payload: DodoWebhookPayload,
) {
  const direct =
    payload.data &&
    typeof payload.data ===
      "object"
      ? payload.data
      : {};

  const nestedObject =
    direct.object &&
    typeof direct.object ===
      "object"
      ? direct.object as
          Record<string, unknown>
      : null;

  return nestedObject || direct;
}
