import {
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";

import {
  FieldValue,
  getFirestore,
} from "firebase-admin/firestore";

const db = getFirestore();

const CONFIG_COLLECTION =
  "systemConfig";

const CONFIG_DOCUMENT =
  "runtime";

const CACHE_TTL_MS =
  5 * 60 * 1000;

export type EmailTemplateConfig = {
  enabled: boolean;
  subject: string;
  html: string;
  text: string;
};

export type ViewBidSystemConfig = {
  version: number;

  general: {
    brandName: string;
    publicUrl: string;
    supportEmail: string;
    legalEmail: string;
    currency: "USD";
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };

  payments: {
    enabled: boolean;
    provider: "dodo";
    environment: "test_mode" | "live_mode";
    dodoProductId: string;
    successMessage: string;
    failureMessage: string;
    cancelledMessage: string;
    refundPolicyText: string;
  };

  email: {
    enabled: boolean;
    provider: "disabled" | "resend";
    senderName: string;
    fromEmail: string;
    replyToEmail: string;
    templates: {
      paymentSuccess: EmailTemplateConfig;
      paymentFailed: EmailTemplateConfig;
      paymentCancelled: EmailTemplateConfig;
      paymentRefunded: EmailTemplateConfig;
      listingApproved: EmailTemplateConfig;
      listingRejected: EmailTemplateConfig;
      boardApproved: EmailTemplateConfig;
      boardRejected: EmailTemplateConfig;
      boardActivated: EmailTemplateConfig;
      welcome: EmailTemplateConfig;
    };
  };

  ranking: {
    publicWeeklyEnabled: boolean;
    publicMonthlyEnabled: boolean;
    boardRankingEnabled: boolean;
    reverseBoostOnRefund: boolean;
    tieBreakRule:
      | "earliest_reached_total"
      | "newest_published";
  };

  limits: {
    publicPageSize: number;
    boardPageSize: number;
    dashboardPageSize: number;
    searchResultLimit: number;
    configCacheSeconds: number;
  };
};

const defaultTemplate = (
  subject: string,
  text: string,
): EmailTemplateConfig => ({
  enabled: true,
  subject,
  html: `<p>${text}</p>`,
  text,
});

export const DEFAULT_SYSTEM_CONFIG:
  ViewBidSystemConfig = {
    version: 1,

    general: {
      brandName: "ViewBid",
      publicUrl:
        "https://visibilitymarketplace.web.app",
      supportEmail:
        "connect@quickstories.in",
      legalEmail:
        "connect@quickstories.in",
      currency: "USD",
      maintenanceMode: false,
      maintenanceMessage:
        "ViewBid is temporarily unavailable. Please try again shortly.",
    },

    payments: {
      enabled: true,
      provider: "dodo",
      environment: "test_mode",
      dodoProductId:
        "pdt_0NnQUn7YwN7JhAgOyPXCr",
      successMessage:
        "Payment confirmed. Your ViewBid action has been applied.",
      failureMessage:
        "Payment was not completed. No ranking change was applied.",
      cancelledMessage:
        "Payment was cancelled. No ranking change was applied.",
      refundPolicyText:
        "Payments are non-refundable after successful processing, except where required by law.",
    },

    email: {
      enabled: false,
      provider: "disabled",
      senderName: "ViewBid",
      fromEmail:
        "connect@quickstories.in",
      replyToEmail:
        "connect@quickstories.in",
      templates: {
        paymentSuccess:
          defaultTemplate(
            "ViewBid payment confirmed",
            "Your payment has been confirmed successfully.",
          ),
        paymentFailed:
          defaultTemplate(
            "ViewBid payment failed",
            "Your payment could not be completed. No ranking change was applied.",
          ),
        paymentCancelled:
          defaultTemplate(
            "ViewBid payment cancelled",
            "Your payment was cancelled. No ranking change was applied.",
          ),
        paymentRefunded:
          defaultTemplate(
            "ViewBid refund processed",
            "Your refund has been recorded by ViewBid.",
          ),
        listingApproved:
          defaultTemplate(
            "Your ViewBid listing was approved",
            "Your listing has been approved.",
          ),
        listingRejected:
          defaultTemplate(
            "Your ViewBid listing needs attention",
            "Your listing was not approved. Please review the reason in ViewBid.",
          ),
        boardApproved:
          defaultTemplate(
            "Your ViewBid Board was approved",
            "Your Board request has been approved and is ready for its next step.",
          ),
        boardRejected:
          defaultTemplate(
            "Your ViewBid Board request was not approved",
            "Your Board request was not approved. Please review the reason in ViewBid.",
          ),
        boardActivated:
          defaultTemplate(
            "Your ViewBid Board is activated",
            "Your Board activation payment has been confirmed.",
          ),
        welcome:
          defaultTemplate(
            "Welcome to ViewBid",
            "Welcome to ViewBid. Your account is ready.",
          ),
      },
    },

    ranking: {
      publicWeeklyEnabled: true,
      publicMonthlyEnabled: true,
      boardRankingEnabled: true,
      reverseBoostOnRefund: true,
      tieBreakRule:
        "earliest_reached_total",
    },

    limits: {
      publicPageSize: 20,
      boardPageSize: 20,
      dashboardPageSize: 25,
      searchResultLimit: 20,
      configCacheSeconds: 300,
    },
  };

let cachedConfig:
  ViewBidSystemConfig | null = null;

let cacheExpiresAt = 0;

function asString(
  value: unknown,
  fallback: string,
  maxLength: number,
): string {
  const normalized =
    String(value ?? "").trim();

  return normalized
    ? normalized.slice(0, maxLength)
    : fallback;
}

function asBoolean(
  value: unknown,
  fallback: boolean,
): boolean {
  return typeof value === "boolean"
    ? value
    : fallback;
}

function asBoundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    return fallback;
  }

  return parsed;
}

function validateEmail(
  value: unknown,
  fallback: string,
): string {
  const normalized =
    asString(value, fallback, 254)
      .toLowerCase();

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    normalized,
  )
    ? normalized
    : fallback;
}

function validateTemplate(
  value: unknown,
  fallback: EmailTemplateConfig,
): EmailTemplateConfig {
  const source =
    value && typeof value === "object"
      ? value as Record<string, unknown>
      : {};

  return {
    enabled:
      asBoolean(
        source.enabled,
        fallback.enabled,
      ),
    subject:
      asString(
        source.subject,
        fallback.subject,
        180,
      ),
    html:
      asString(
        source.html,
        fallback.html,
        20000,
      ),
    text:
      asString(
        source.text,
        fallback.text,
        10000,
      ),
  };
}

export function normalizeSystemConfig(
  value: unknown,
): ViewBidSystemConfig {
  const source =
    value && typeof value === "object"
      ? value as Record<string, unknown>
      : {};

  const general =
    source.general &&
    typeof source.general === "object"
      ? source.general as Record<string, unknown>
      : {};

  const payments =
    source.payments &&
    typeof source.payments === "object"
      ? source.payments as Record<string, unknown>
      : {};

  const email =
    source.email &&
    typeof source.email === "object"
      ? source.email as Record<string, unknown>
      : {};

  const emailTemplates =
    email.templates &&
    typeof email.templates === "object"
      ? email.templates as Record<string, unknown>
      : {};

  const ranking =
    source.ranking &&
    typeof source.ranking === "object"
      ? source.ranking as Record<string, unknown>
      : {};

  const limits =
    source.limits &&
    typeof source.limits === "object"
      ? source.limits as Record<string, unknown>
      : {};

  const environment =
    payments.environment === "live_mode"
      ? "live_mode"
      : "test_mode";

  const provider =
    email.provider === "resend"
      ? "resend"
      : "disabled";

  const tieBreakRule =
    ranking.tieBreakRule ===
      "newest_published"
      ? "newest_published"
      : "earliest_reached_total";

  const templates =
    DEFAULT_SYSTEM_CONFIG.email.templates;

  return {
    version:
      asBoundedInteger(
        source.version,
        DEFAULT_SYSTEM_CONFIG.version,
        1,
        1000000000,
      ),

    general: {
      brandName:
        asString(
          general.brandName,
          DEFAULT_SYSTEM_CONFIG.general.brandName,
          80,
        ),
      publicUrl:
        asString(
          general.publicUrl,
          DEFAULT_SYSTEM_CONFIG.general.publicUrl,
          500,
        ),
      supportEmail:
        validateEmail(
          general.supportEmail,
          DEFAULT_SYSTEM_CONFIG.general.supportEmail,
        ),
      legalEmail:
        validateEmail(
          general.legalEmail,
          DEFAULT_SYSTEM_CONFIG.general.legalEmail,
        ),
      currency: "USD",
      maintenanceMode:
        asBoolean(
          general.maintenanceMode,
          DEFAULT_SYSTEM_CONFIG.general.maintenanceMode,
        ),
      maintenanceMessage:
        asString(
          general.maintenanceMessage,
          DEFAULT_SYSTEM_CONFIG.general.maintenanceMessage,
          500,
        ),
    },

    payments: {
      enabled:
        asBoolean(
          payments.enabled,
          DEFAULT_SYSTEM_CONFIG.payments.enabled,
        ),
      provider: "dodo",
      environment,
      dodoProductId:
        asString(
          payments.dodoProductId,
          DEFAULT_SYSTEM_CONFIG.payments.dodoProductId,
          180,
        ),
      successMessage:
        asString(
          payments.successMessage,
          DEFAULT_SYSTEM_CONFIG.payments.successMessage,
          500,
        ),
      failureMessage:
        asString(
          payments.failureMessage,
          DEFAULT_SYSTEM_CONFIG.payments.failureMessage,
          500,
        ),
      cancelledMessage:
        asString(
          payments.cancelledMessage,
          DEFAULT_SYSTEM_CONFIG.payments.cancelledMessage,
          500,
        ),
      refundPolicyText:
        asString(
          payments.refundPolicyText,
          DEFAULT_SYSTEM_CONFIG.payments.refundPolicyText,
          1000,
        ),
    },

    email: {
      enabled:
        asBoolean(
          email.enabled,
          DEFAULT_SYSTEM_CONFIG.email.enabled,
        ),
      provider,
      senderName:
        asString(
          email.senderName,
          DEFAULT_SYSTEM_CONFIG.email.senderName,
          120,
        ),
      fromEmail:
        validateEmail(
          email.fromEmail,
          DEFAULT_SYSTEM_CONFIG.email.fromEmail,
        ),
      replyToEmail:
        validateEmail(
          email.replyToEmail,
          DEFAULT_SYSTEM_CONFIG.email.replyToEmail,
        ),
      templates: {
        paymentSuccess:
          validateTemplate(
            emailTemplates.paymentSuccess,
            templates.paymentSuccess,
          ),
        paymentFailed:
          validateTemplate(
            emailTemplates.paymentFailed,
            templates.paymentFailed,
          ),
        paymentCancelled:
          validateTemplate(
            emailTemplates.paymentCancelled,
            templates.paymentCancelled,
          ),
        paymentRefunded:
          validateTemplate(
            emailTemplates.paymentRefunded,
            templates.paymentRefunded,
          ),
        listingApproved:
          validateTemplate(
            emailTemplates.listingApproved,
            templates.listingApproved,
          ),
        listingRejected:
          validateTemplate(
            emailTemplates.listingRejected,
            templates.listingRejected,
          ),
        boardApproved:
          validateTemplate(
            emailTemplates.boardApproved,
            templates.boardApproved,
          ),
        boardRejected:
          validateTemplate(
            emailTemplates.boardRejected,
            templates.boardRejected,
          ),
        boardActivated:
          validateTemplate(
            emailTemplates.boardActivated,
            templates.boardActivated,
          ),
        welcome:
          validateTemplate(
            emailTemplates.welcome,
            templates.welcome,
          ),
      },
    },

    ranking: {
      publicWeeklyEnabled:
        asBoolean(
          ranking.publicWeeklyEnabled,
          DEFAULT_SYSTEM_CONFIG.ranking.publicWeeklyEnabled,
        ),
      publicMonthlyEnabled:
        asBoolean(
          ranking.publicMonthlyEnabled,
          DEFAULT_SYSTEM_CONFIG.ranking.publicMonthlyEnabled,
        ),
      boardRankingEnabled:
        asBoolean(
          ranking.boardRankingEnabled,
          DEFAULT_SYSTEM_CONFIG.ranking.boardRankingEnabled,
        ),
      reverseBoostOnRefund:
        asBoolean(
          ranking.reverseBoostOnRefund,
          DEFAULT_SYSTEM_CONFIG.ranking.reverseBoostOnRefund,
        ),
      tieBreakRule,
    },

    limits: {
      publicPageSize:
        asBoundedInteger(
          limits.publicPageSize,
          DEFAULT_SYSTEM_CONFIG.limits.publicPageSize,
          5,
          100,
        ),
      boardPageSize:
        asBoundedInteger(
          limits.boardPageSize,
          DEFAULT_SYSTEM_CONFIG.limits.boardPageSize,
          5,
          100,
        ),
      dashboardPageSize:
        asBoundedInteger(
          limits.dashboardPageSize,
          DEFAULT_SYSTEM_CONFIG.limits.dashboardPageSize,
          5,
          100,
        ),
      searchResultLimit:
        asBoundedInteger(
          limits.searchResultLimit,
          DEFAULT_SYSTEM_CONFIG.limits.searchResultLimit,
          5,
          100,
        ),
      configCacheSeconds:
        asBoundedInteger(
          limits.configCacheSeconds,
          DEFAULT_SYSTEM_CONFIG.limits.configCacheSeconds,
          30,
          3600,
        ),
    },
  };
}

async function assertAdmin(
  uid: string,
) {
  const userSnap =
    await db
      .collection("users")
      .doc(uid)
      .get();

  if (
    !userSnap.exists ||
    userSnap.data()?.role !== "admin"
  ) {
    throw new HttpsError(
      "permission-denied",
      "Admin access required.",
    );
  }
}

export async function getRuntimeSystemConfig(
  forceRefresh = false,
): Promise<ViewBidSystemConfig> {
  const now = Date.now();

  if (
    !forceRefresh &&
    cachedConfig &&
    now < cacheExpiresAt
  ) {
    return cachedConfig;
  }

  const snap =
    await db
      .collection(CONFIG_COLLECTION)
      .doc(CONFIG_DOCUMENT)
      .get();

  const config =
    snap.exists
      ? normalizeSystemConfig(
          snap.data(),
        )
      : DEFAULT_SYSTEM_CONFIG;

  cachedConfig = config;
  cacheExpiresAt =
    now +
    config.limits.configCacheSeconds *
      1000;

  return config;
}

export const getAdminSystemConfig =
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

      await assertAdmin(
        request.auth.uid,
      );

      return {
        success: true,
        config:
          await getRuntimeSystemConfig(
            true,
          ),
      };
    },
  );

export const updateAdminSystemConfig =
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

      await assertAdmin(
        request.auth.uid,
      );

      const incoming =
        normalizeSystemConfig(
          request.data?.config,
        );

      const configRef =
        db
          .collection(CONFIG_COLLECTION)
          .doc(CONFIG_DOCUMENT);

      const auditRef =
        db
          .collection("auditEvents")
          .doc();

      let savedConfig = incoming;

      await db.runTransaction(
        async (transaction) => {
          const currentSnap =
            await transaction.get(
              configRef,
            );

          const current =
            currentSnap.exists
              ? normalizeSystemConfig(
                  currentSnap.data(),
                )
              : DEFAULT_SYSTEM_CONFIG;

          savedConfig = {
            ...incoming,
            version:
              current.version + 1,
          };

          transaction.set(
            configRef,
            {
              ...savedConfig,
              updatedAt:
                FieldValue.serverTimestamp(),
              updatedByUserId:
                request.auth!.uid,
            },
          );

          transaction.set(
            auditRef,
            {
              id: auditRef.id,
              type:
                "system_config_updated",
              actorUserId:
                request.auth!.uid,
              createdAt:
                FieldValue.serverTimestamp(),
              metadata: {
                previousVersion:
                  current.version,
                newVersion:
                  savedConfig.version,
              },
            },
          );
        },
      );

      cachedConfig = savedConfig;
      cacheExpiresAt =
        Date.now() +
        savedConfig.limits
          .configCacheSeconds *
          1000;

      return {
        success: true,
        config: savedConfig,
      };
    },
  );
