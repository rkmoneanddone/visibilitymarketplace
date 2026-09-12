import {
  dodoApiBaseUrl,
  dodoApiKey,
} from "./dodoProvider";

import {
  getRuntimeSystemConfig,
} from "./systemConfig";

const BASE_CURRENCY = "INR";
const PRODUCT_CHECK_AMOUNT_MINOR = 10_000;
const PRODUCT_CHECK_TTL_MS = 5 * 60 * 1000;

let verifiedProductKey = "";
let verifiedProductUntil = 0;

function normalizeString(value: unknown): string {
  return String(value ?? "").trim();
}

function resolveApiBaseUrl(
  environment: "test_mode" | "live_mode",
) {
  const override = dodoApiBaseUrl.value().trim();

  if (override) {
    return override.replace(/\/$/, "");
  }

  return environment === "live_mode"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";
}

async function dodoJsonRequest(
  path: string,
  init: RequestInit,
) {
  const apiKey = dodoApiKey.value().trim();
  if (!apiKey) {
    throw new Error("DODO_API_KEY is not configured.");
  }

  const config = await getRuntimeSystemConfig();
  const response = await fetch(
    `${resolveApiBaseUrl(config.payments.environment)}${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    },
  );

  const raw = await response.text();
  let body: Record<string, unknown> = {};

  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    body = {};
  }

  if (!response.ok) {
    throw new Error(
      `Dodo request failed (${response.status}): ${String(
        body.message || raw || "Unknown error",
      ).slice(0, 500)}`,
    );
  }

  return body;
}

async function previewRaw(
  productId: string,
  amountMinor: number,
  country: string,
) {
  return dodoJsonRequest(
    "/checkouts/preview",
    {
      method: "POST",
      body: JSON.stringify({
        product_cart: [
          {
            product_id: productId,
            quantity: 1,
            amount: amountMinor,
          },
        ],
        billing_address: {
          country,
        },
        feature_flags: {
          allow_currency_selection: true,
        },
      }),
    },
  );
}

/**
 * Dynamic/PWYW amounts use the configured Dodo product's price currency.
 * Verify that an Indian preview preserves Rs 100 as INR 100 before any
 * ViewBid checkout is allowed. This prevents an old USD product from
 * interpreting 10,000 paise as 10,000 cents.
 */
export async function assertDodoInrProduct() {
  const config = await getRuntimeSystemConfig();
  const productId = config.payments.dodoProductId.trim();

  if (!productId) {
    throw new Error("Dodo Product ID is not configured.");
  }

  const cacheKey = `${config.payments.environment}:${productId}`;
  if (cacheKey === verifiedProductKey && Date.now() < verifiedProductUntil) {
    return;
  }

  const body = await previewRaw(
    productId,
    PRODUCT_CHECK_AMOUNT_MINOR,
    "IN",
  );

  const currency = normalizeString(body.currency).toUpperCase();
  const breakup = body.current_breakup && typeof body.current_breakup === "object"
    ? body.current_breakup as Record<string, unknown>
    : {};
  const subtotal = Number(breakup.subtotal);

  if (currency !== BASE_CURRENCY || subtotal !== PRODUCT_CHECK_AMOUNT_MINOR) {
    throw new Error(
      "The configured Dodo product is not operating as an INR-base PWYW product. Configure an INR product before enabling ViewBid INR checkout.",
    );
  }

  verifiedProductKey = cacheKey;
  verifiedProductUntil = Date.now() + PRODUCT_CHECK_TTL_MS;
}

export type AdaptiveDodoCheckoutInput = {
  paymentIntentId: string;
  clientStatusToken: string;
  purpose: string;
  targetKind: string;
  targetId: string;
  amountMinor: number;
  currency: string;
};

export async function createAdaptiveDodoCheckout(
  input: AdaptiveDodoCheckoutInput,
) {
  const config = await getRuntimeSystemConfig();

  if (!config.payments.enabled) {
    throw new Error("ViewBid payments are currently disabled by system configuration.");
  }

  if (
    input.purpose === "listing_push" &&
    !config.ranking.publicWeeklyEnabled &&
    !config.ranking.publicMonthlyEnabled
  ) {
    throw new Error(
      "Public Push Up payments are disabled because Public ranking is disabled.",
    );
  }

  if (
    input.purpose === "board_entry_push" &&
    !config.ranking.boardRankingEnabled
  ) {
    throw new Error(
      "Board Push Up payments are disabled because Board ranking is disabled.",
    );
  }

  if (normalizeString(input.currency).toUpperCase() !== BASE_CURRENCY) {
    throw new Error("ViewBid checkout base currency must be INR.");
  }

  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 10_000) {
    throw new Error("ViewBid INR checkout amount must be at least Rs 100.");
  }

  await assertDodoInrProduct();

  const productId = config.payments.dodoProductId.trim();
  const publicUrl = config.general.publicUrl.trim().replace(/\/$/, "");
  const returnUrl = publicUrl
    ? `${publicUrl}/?payment=return&intent=${encodeURIComponent(
        input.paymentIntentId,
      )}&token=${encodeURIComponent(input.clientStatusToken)}`
    : undefined;

  const body = await dodoJsonRequest(
    "/checkouts",
    {
      method: "POST",
      body: JSON.stringify({
        product_cart: [
          {
            product_id: productId,
            quantity: 1,
            amount: input.amountMinor,
          },
        ],
        // Deliberately omit billing_currency. With Adaptive Currency enabled,
        // Dodo chooses the customer's supported local currency at checkout.
        feature_flags: {
          allow_currency_selection: true,
        },
        return_url: returnUrl,
        metadata: {
          viewbid_payment_intent_id: input.paymentIntentId,
          viewbid_payment_purpose: input.purpose,
          viewbid_target_kind: input.targetKind,
          viewbid_target_id: input.targetId,
          viewbid_base_currency: BASE_CURRENCY,
          viewbid_config_version: String(config.version),
        },
      }),
    },
  );

  const sessionId = normalizeString(body.session_id);
  const checkoutUrl = normalizeString(body.checkout_url);

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

export async function previewDodoLocalizedPrice(
  amountMinor: number,
  country: string,
) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 10_000) {
    throw new Error("Invalid INR preview amount.");
  }

  const normalizedCountry = normalizeString(country).toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalizedCountry)) {
    throw new Error("Invalid billing country.");
  }

  await assertDodoInrProduct();

  const config = await getRuntimeSystemConfig();
  const body = await previewRaw(
    config.payments.dodoProductId.trim(),
    amountMinor,
    normalizedCountry,
  );

  const currency = normalizeString(body.currency).toUpperCase();
  const billingCountry = normalizeString(body.billing_country).toUpperCase();
  const breakup = body.current_breakup && typeof body.current_breakup === "object"
    ? body.current_breakup as Record<string, unknown>
    : {};

  const subtotalMinor = Number(breakup.subtotal);
  const totalAmountMinor = Number(breakup.total_amount);
  const taxMinor = Number(breakup.tax ?? 0);

  if (
    !currency ||
    !Number.isSafeInteger(subtotalMinor) ||
    subtotalMinor < 0 ||
    !Number.isSafeInteger(totalAmountMinor) ||
    totalAmountMinor < 0 ||
    !Number.isSafeInteger(taxMinor) ||
    taxMinor < 0
  ) {
    throw new Error("Dodo localized price preview returned invalid totals.");
  }

  return {
    billingCountry: billingCountry || normalizedCountry,
    currency,
    subtotalMinor,
    totalAmountMinor,
    taxMinor,
  };
}
