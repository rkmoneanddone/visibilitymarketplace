import {
  onCall,
} from "firebase-functions/v2/https";

import {
  getRuntimeSystemConfig,
} from "./systemConfig";

export const getPublicSystemConfig =
  onCall(
    {
      region: "asia-south1",
    },
    async () => {
      const config =
        await getRuntimeSystemConfig();

      return {
        success: true,
        config: {
          version:
            config.version,
          general: {
            brandName:
              config.general.brandName,
            supportEmail:
              config.general.supportEmail,
            legalEmail:
              config.general.legalEmail,
            maintenanceMode:
              config.general.maintenanceMode,
            maintenanceMessage:
              config.general.maintenanceMessage,
          },
          payments: {
            enabled:
              config.payments.enabled,
            successMessage:
              config.payments.successMessage,
            failureMessage:
              config.payments.failureMessage,
            cancelledMessage:
              config.payments.cancelledMessage,
            refundPolicyText:
              config.payments.refundPolicyText,
          },
          ranking: {
            publicWeeklyEnabled:
              config.ranking.publicWeeklyEnabled,
            publicMonthlyEnabled:
              config.ranking.publicMonthlyEnabled,
            boardRankingEnabled:
              config.ranking.boardRankingEnabled,
          },
          limits: {
            publicPageSize:
              config.limits.publicPageSize,
            boardPageSize:
              config.limits.boardPageSize,
            dashboardPageSize:
              config.limits.dashboardPageSize,
            searchResultLimit:
              config.limits.searchResultLimit,
          },
        },
      };
    },
  );
