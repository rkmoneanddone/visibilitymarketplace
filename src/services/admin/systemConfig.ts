import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import {
  firebaseApp,
} from "../../config/firebase";

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
    environment:
      | "test_mode"
      | "live_mode";
    dodoProductId: string;
    successMessage: string;
    failureMessage: string;
    cancelledMessage: string;
    refundPolicyText: string;
  };
  email: {
    enabled: boolean;
    provider:
      | "disabled"
      | "resend";
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

type ConfigResult = {
  success: boolean;
  config: ViewBidSystemConfig;
};

const functions =
  getFunctions(
    firebaseApp,
    "asia-south1",
  );

const getConfigCallable =
  httpsCallable<
    Record<string, never>,
    ConfigResult
  >(
    functions,
    "getAdminSystemConfig",
  );

const updateConfigCallable =
  httpsCallable<
    {
      config: ViewBidSystemConfig;
    },
    ConfigResult
  >(
    functions,
    "updateAdminSystemConfig",
  );

export async function getAdminSystemConfig():
  Promise<ViewBidSystemConfig> {
  const result =
    await getConfigCallable({});

  return result.data.config;
}

export async function updateAdminSystemConfig(
  config: ViewBidSystemConfig,
): Promise<ViewBidSystemConfig> {
  const result =
    await updateConfigCallable({
      config,
    });

  return result.data.config;
}
