import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import {
  defineSecret,
  defineString,
} from "firebase-functions/params";

export const dodoApiKey =
  defineSecret("DODO_API_KEY");

export const dodoWebhookKey =
  defineSecret("DODO_WEBHOOK_KEY");

export const dodoEnvironment =
  defineString(
    "DODO_ENVIRONMENT",
    {
      default: "test_mode",
      description:
        "Dodo environment: test_mode or live_mode.",
    },
  );

export const dodoProductId =
  defineString(
    "DODO_PRODUCT_ID",
    {
      default:
        "pdt_0NnQUn7YwN7JhAgOyPXCr",
      description:
        "Single Pay What You Want Dodo product used for ViewBid payments.",
    },
  );

export const dodoApiBaseUrl =
  defineString(
    "DODO_API_BASE_URL",
    {
      default: "",
      description:
        "Optional Dodo API base URL override. Leave empty to derive it from DODO_ENVIRONMENT.",
    },
  );

export const viewBidPublicUrl =
  defineString(
    "VIEWBID_PUBLIC_URL",
    {
      default:
        "https://visibilitymarketplace.web.app",
      description:
        "Public ViewBid URL used for payment return redirects.",
    },
  );

type DodoCheckoutInput = {
  paymentIntentId: string;
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

function normalizeEnvironment() {
  const value =
    dodoEnvironment.value().trim();

  if (
    value !== "test_mode" &&
    value !== "live_mode"
  ) {
    throw new Error(
      "DODO_ENVIRONMENT must be test_mode or live_mode.",
    );
  }

  return value;
}

function resolveApiBaseUrl() {
  const override =
    dodoApiBaseUrl.value().trim();

  if (override) {
    return override.replace(/\/$/, "");
  }

  return normalizeEnvironment() ===
    "live_mode"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";
}

export async function createDodoCheckout(
  input: DodoCheckoutInput,
): Promise<DodoCheckoutResult> {
  const apiKey =
    dodoApiKey.value().trim();

  const productId =
    dodoProductId.value().trim();

  if (!apiKey) {
    throw new Error(
      "DODO_API_KEY is not configured.",
    );
  }

  if (!productId) {
    throw new Error(
      "DODO_PRODUCT_ID is not configured.",
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

  const publicUrl =
    viewBidPublicUrl
      .value()
      .trim()
      .replace(/\/$/, "");

  const response =
    await fetch(
      `${resolveApiBaseUrl()}/checkouts`,
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
          return_url:
            publicUrl
              ? `${publicUrl}/?payment=return`
              : undefined,
          metadata: {
            viewbid_payment_intent_id:
              input.paymentIntentId,
            viewbid_payment_purpose:
              input.purpose,
            viewbid_target_kind:
              input.targetKind,
            viewbid_target_id:
              input.targetId,
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
