import {
  FieldValue,
  type Firestore,
} from "firebase-admin/firestore";

import {
  getRuntimeSystemConfig,
} from "./systemConfig";

function normalizeString(
  value: unknown,
) {
  return String(value ?? "").trim();
}

function toDate(
  value: unknown,
): Date | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {
    const date =
      (
        value as {
          toDate: () => Date;
        }
      ).toDate();

    return Number.isNaN(
      date.getTime(),
    )
      ? null
      : date;
  }

  const date =
    new Date(
      String(value ?? ""),
    );

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date;
}

function getUtcWeekKey(
  date: Date,
) {
  const day = date.getUTCDay();

  const daysFromMonday =
    day === 0
      ? 6
      : day - 1;

  const monday =
    new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() -
          daysFromMonday,
      ),
    );

  return [
    monday.getUTCFullYear(),
    String(
      monday.getUTCMonth() + 1,
    ).padStart(2, "0"),
    String(
      monday.getUTCDate(),
    ).padStart(2, "0"),
  ].join("-");
}

function getUtcMonthKey(
  date: Date,
) {
  return [
    date.getUTCFullYear(),
    String(
      date.getUTCMonth() + 1,
    ).padStart(2, "0"),
  ].join("-");
}

function boundedSubtract(
  current: unknown,
  amount: number,
) {
  const numeric = Number(current ?? 0);

  return Math.max(
    0,
    (Number.isFinite(numeric)
      ? numeric
      : 0) - amount,
  );
}

export async function reverseVerifiedPaymentForRefund(
  db: Firestore,
  paymentIntentId: string,
  providerRefundId?: string,
) {
  const config =
    await getRuntimeSystemConfig();

  const paymentRef =
    db
      .collection("paymentIntents")
      .doc(paymentIntentId);

  const auditRef =
    db
      .collection("auditEvents")
      .doc(
        `payment_refund_reversal_${paymentIntentId}`,
      );

  let rankingReversed = false;

  await db.runTransaction(
    async (transaction) => {
      const paymentSnap =
        await transaction.get(
          paymentRef,
        );

      if (!paymentSnap.exists) {
        throw new Error(
          "Payment intent not found during refund reversal.",
        );
      }

      const payment =
        paymentSnap.data();

      if (
        payment?.refundProcessedAt ||
        payment?.rankingReversedAt
      ) {
        return;
      }

      const amountMinor =
        Number(
          payment?.amountMinor,
        );

      if (
        !Number.isSafeInteger(
          amountMinor,
        ) ||
        amountMinor <= 0
      ) {
        throw new Error(
          "Refund reversal payment amount is invalid.",
        );
      }

      const purpose =
        normalizeString(
          payment?.purpose,
        );

      const targetId =
        normalizeString(
          payment?.targetId,
        );

      if (!targetId) {
        throw new Error(
          "Refund reversal target is missing.",
        );
      }

      if (
        config.ranking
          .reverseBoostOnRefund &&
        purpose === "listing_push"
      ) {
        const listingRef =
          db
            .collection("listings")
            .doc(targetId);

        const listingSnap =
          await transaction.get(
            listingRef,
          );

        if (!listingSnap.exists) {
          throw new Error(
            "Listing not found during refund reversal.",
          );
        }

        const listing =
          listingSnap.data();

        const verifiedDate =
          toDate(
            payment?.verifiedAt,
          );

        const update:
          Record<string, unknown> = {
            currentBoostTotalMinor:
              boundedSubtract(
                listing?.currentBoostTotalMinor,
                amountMinor,
              ),
            updatedAt:
              FieldValue.serverTimestamp(),
          };

        if (verifiedDate) {
          const weekKey =
            getUtcWeekKey(
              verifiedDate,
            );

          const monthKey =
            getUtcMonthKey(
              verifiedDate,
            );

          if (
            normalizeString(
              listing?.weeklyBoostKey,
            ) === weekKey
          ) {
            update.weeklyBoostTotalMinor =
              boundedSubtract(
                listing?.weeklyBoostTotalMinor,
                amountMinor,
              );
          }

          if (
            normalizeString(
              listing?.monthlyBoostKey,
            ) === monthKey
          ) {
            update.monthlyBoostTotalMinor =
              boundedSubtract(
                listing?.monthlyBoostTotalMinor,
                amountMinor,
              );
          }
        }

        transaction.update(
          listingRef,
          update,
        );

        rankingReversed = true;
      } else if (
        config.ranking
          .reverseBoostOnRefund &&
        purpose ===
          "board_entry_push"
      ) {
        const entryRef =
          db
            .collection("boardEntries")
            .doc(targetId);

        const entrySnap =
          await transaction.get(
            entryRef,
          );

        if (!entrySnap.exists) {
          throw new Error(
            "Board Entry not found during refund reversal.",
          );
        }

        const entry =
          entrySnap.data();

        transaction.update(
          entryRef,
          {
            boostTotalMinor:
              boundedSubtract(
                entry?.boostTotalMinor,
                amountMinor,
              ),
            supporterCount:
              boundedSubtract(
                entry?.supporterCount,
                1,
              ),
            updatedAt:
              FieldValue.serverTimestamp(),
          },
        );

        rankingReversed = true;
      }

      const now =
        FieldValue.serverTimestamp();

      transaction.set(
        paymentRef,
        {
          refundStatus: "succeeded",
          refundProviderId:
            providerRefundId || null,
          refundProcessedAt: now,
          refundUpdatedAt: now,
          ...(rankingReversed
            ? {
                rankingReversedAt:
                  now,
                rankingReversalAmountMinor:
                  amountMinor,
              }
            : {}),
          updatedAt: now,
        },
        {
          merge: true,
        },
      );

      transaction.set(
        auditRef,
        {
          id: auditRef.id,
          type:
            "payment_refund_processed",
          paymentIntentId,
          actorUserId: null,
          createdAt: now,
          metadata: {
            purpose,
            targetId,
            amountMinor,
            rankingReversed,
            providerRefundId:
              providerRefundId || null,
          },
        },
        {
          merge: false,
        },
      );
    },
  );

  return {
    rankingReversed,
  };
}
