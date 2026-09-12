import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import {
  firebaseApp,
} from "../../config/firebase";

export type PublicRuntimeConfig = {
  version: number;
  general: {
    brandName: string;
    supportEmail: string;
    legalEmail: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };
  payments: {
    enabled: boolean;
    successMessage: string;
    failureMessage: string;
    cancelledMessage: string;
    refundPolicyText: string;
  };
  ranking: {
    publicWeeklyEnabled: boolean;
    publicMonthlyEnabled: boolean;
    boardRankingEnabled: boolean;
    tieBreakRule:
      | "earliest_reached_total"
      | "newest_published";
  };
  limits: {
    publicPageSize: number;
    boardPageSize: number;
    dashboardPageSize: number;
    searchResultLimit: number;
  };
};

type RuntimeConfigResult = {
  success: boolean;
  config: PublicRuntimeConfig;
};

const functions =
  getFunctions(
    firebaseApp,
    "asia-south1",
  );

const getRuntimeConfigCallable =
  httpsCallable<
    Record<string, never>,
    RuntimeConfigResult
  >(
    functions,
    "getPublicSystemConfig",
  );

const SESSION_KEY =
  "viewbid_runtime_config_v1";

let cachedConfig:
  PublicRuntimeConfig | null = null;

let pendingLoad:
  Promise<PublicRuntimeConfig> | null = null;

function readSessionCache() {
  if (
    cachedConfig ||
    typeof window === "undefined"
  ) {
    return cachedConfig;
  }

  try {
    const raw =
      window.sessionStorage.getItem(
        SESSION_KEY,
      );

    if (!raw) {
      return null;
    }

    cachedConfig =
      JSON.parse(
        raw,
      ) as PublicRuntimeConfig;

    return cachedConfig;
  } catch {
    return null;
  }
}

function writeSessionCache(
  config: PublicRuntimeConfig,
) {
  cachedConfig = config;

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify(config),
    );
  } catch {
    // Session storage is optional.
  }
}

export async function getPublicRuntimeConfig(
  forceRefresh = false,
): Promise<PublicRuntimeConfig> {
  if (!forceRefresh) {
    const existing =
      readSessionCache();

    if (existing) {
      return existing;
    }

    if (pendingLoad) {
      return pendingLoad;
    }
  }

  pendingLoad =
    getRuntimeConfigCallable({})
      .then((result) => {
        writeSessionCache(
          result.data.config,
        );

        return result.data.config;
      })
      .finally(() => {
        pendingLoad = null;
      });

  return pendingLoad;
}

export function clearPublicRuntimeConfigCache() {
  cachedConfig = null;
  pendingLoad = null;

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(
      SESSION_KEY,
    );
  } catch {
    // Session storage is optional.
  }
}
