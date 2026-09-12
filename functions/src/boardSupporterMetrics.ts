import {
  createHash,
} from "node:crypto";

import {
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";

import {
  getApps,
  initializeApp,
} from "firebase-admin/app";

import {
  FieldValue,
  getFirestore,
} from "firebase-admin/firestore";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

function normalizeString(
  value: unknown,
) {
  return String(value ?? "").trim();
}

function supporterIdentity(
  payment: FirebaseFirestore.DocumentData,
) {
  const userId =
    normalizeString(
      payment.createdByUserId,
    );

  if (userId) {
    return {
      kind: "user",
      value: userId,
    } as const;
  }

  const email =
    normalizeString(
      payment.customerEmail,
    ).toLowerCase();

  if (email) {
    return {
      kind: "email",
      value: email,
    } as const;
  }

  return null;
}

function identityHash(
  kind: string,
  value: string,
) {
  return createHash("sha256")
    .update(`${kind}:${value}`)
    .digest("hex");
}

function boundedSubtract(
  value: unknown,
  amount: number,
) {
  const current = Number(value ?? 0);

  return Math.max(
    0,
    (Number.isFinite(current)
      ? current
      : 0) - amount,
  );
}

export const reconcileBoardSupporterMetrics =
  onDocumentUpdated(
    {
      document:
        "paymentIntents/{paymentIntentId}",
      region: "asia-south1",
    },
    async (event) => {
      const after =
        event.data?.after.data();

      if (
        !after ||
        after.purpose !==
          "board_entry_push" ||
        !after.fulfilledAt
      ) {
        return;
      }

      const paymentRef =
        event.data!.after.ref;

      await db.runTransaction(
        async (transaction) => {
          const paymentSnap =
            await transaction.get(
              paymentRef,
            );

          if (!paymentSnap.exists) {
            return;
          }

          const payment =
            paymentSnap.data();

          if (
            payment?.purpose !==
              "board_entry_push" ||
            !payment?.fulfilledAt
          ) {
            return;
          }

          const entryId =
            normalizeString(
              payment.targetId,
            );

          if (!entryId) {
            return;
          }

          const entryRef =
            db
              .collection("boardEntries")
              .doc(entryId);

          const entrySnap =
            await transaction.get(
              entryRef,
            );

          if (!entrySnap.exists) {
            return;
          }

          const entry = entrySnap.data();

          const refunded =
            Boolean(
              payment.refundProcessedAt,
            );

          const applied =
            Boolean(
              payment.supporterMetricsAppliedAt,
            );

          const reversed =
            Boolean(
              payment.supporterMetricsReversedAt,
            );

          const identity =
            supporterIdentity(payment ?? {});

          const hash =
            identity
              ? identityHash(
                  identity.kind,
                  identity.value,
                )
              : null;

          const supporterRef =
            hash
              ? db
                  .collection(
                    "boardEntrySupporters",
                  )
                  .doc(
                    `${entryId}_${hash}`,
                  )
              : null;

          const supporterSnap =
            supporterRef
              ? await transaction.get(
                  supporterRef,
                )
              : null;

          if (!applied) {
            if (refunded) {
              transaction.set(
                paymentRef,
                {
                  supporterMetricsAppliedAt:
                    FieldValue.serverTimestamp(),
                  supporterMetricsReversedAt:
                    FieldValue.serverTimestamp(),
                  supporterIdentityHash:
                    hash,
                  supporterCounted: false,
                },
                {
                  merge: true,
                },
              );

              return;
            }

            const supporterExists =
              Boolean(
                supporterSnap?.exists,
              );

            transaction.update(
              entryRef,
              {
                pushCount:
                  Number(
                    entry?.pushCount ?? 0,
                  ) + 1,
                supporterCount:
                  identity &&
                  !supporterExists
                    ? Number(
                        entry?.supporterCount ?? 0,
                      )
                    : boundedSubtract(
                        entry?.supporterCount,
                        1,
                      ),
                updatedAt:
                  FieldValue.serverTimestamp(),
              },
            );

            if (
              supporterRef &&
              identity
            ) {
              if (supporterExists) {
                const supporter =
                  supporterSnap!.data();

                transaction.set(
                  supporterRef,
                  {
                    activePushCount:
                      Number(
                        supporter?.activePushCount ?? 0,
                      ) + 1,
                    totalPushCount:
                      Number(
                        supporter?.totalPushCount ?? 0,
                      ) + 1,
                    activeAmountMinor:
                      Number(
                        supporter?.activeAmountMinor ?? 0,
                      ) +
                      Number(
                        payment.amountMinor ?? 0,
                      ),
                    totalAmountMinor:
                      Number(
                        supporter?.totalAmountMinor ?? 0,
                      ) +
                      Number(
                        payment.amountMinor ?? 0,
                      ),
                    updatedAt:
                      FieldValue.serverTimestamp(),
                  },
                  {
                    merge: true,
                  },
                );
              } else {
                transaction.set(
                  supporterRef,
                  {
                    id: supporterRef.id,
                    boardEntryId: entryId,
                    boardId:
                      normalizeString(
                        entry?.boardId,
                      ),
                    identityHash: hash,
                    identityKind:
                      identity.kind,
                    activePushCount: 1,
                    totalPushCount: 1,
                    activeAmountMinor:
                      Number(
                        payment.amountMinor ?? 0,
                      ),
                    totalAmountMinor:
                      Number(
                        payment.amountMinor ?? 0,
                      ),
                    createdAt:
                      FieldValue.serverTimestamp(),
                    updatedAt:
                      FieldValue.serverTimestamp(),
                  },
                );
              }
            }

            transaction.set(
              paymentRef,
              {
                supporterMetricsAppliedAt:
                  FieldValue.serverTimestamp(),
                supporterIdentityHash:
                  hash,
                supporterCounted:
                  Boolean(
                    identity &&
                    !supporterExists,
                  ),
              },
              {
                merge: true,
              },
            );

            return;
          }

          if (
            !refunded ||
            reversed
          ) {
            return;
          }

          let supporterShouldRemain = false;

          if (
            supporterRef &&
            supporterSnap?.exists
          ) {
            const supporter =
              supporterSnap.data();

            const activePushCount =
              Math.max(
                0,
                Number(
                  supporter?.activePushCount ?? 0,
                ),
              );

            supporterShouldRemain =
              activePushCount > 1;

            transaction.set(
              supporterRef,
              {
                activePushCount:
                  Math.max(
                    0,
                    activePushCount - 1,
                  ),
                activeAmountMinor:
                  boundedSubtract(
                    supporter?.activeAmountMinor,
                    Number(
                      payment.amountMinor ?? 0,
                    ),
                  ),
                updatedAt:
                  FieldValue.serverTimestamp(),
              },
              {
                merge: true,
              },
            );
          }

          const entryUpdate:
            Record<string, unknown> = {
              pushCount:
                boundedSubtract(
                  entry?.pushCount,
                  1,
                ),
              updatedAt:
                FieldValue.serverTimestamp(),
            };

          if (
            supporterShouldRemain ||
            payment.supporterCounted ===
              false
          ) {
            entryUpdate.supporterCount =
              Number(
                entry?.supporterCount ?? 0,
              ) + 1;
          }

          transaction.update(
            entryRef,
            entryUpdate,
          );

          transaction.set(
            paymentRef,
            {
              supporterMetricsReversedAt:
                FieldValue.serverTimestamp(),
            },
            {
              merge: true,
            },
          );
        },
      );
    },
  );
