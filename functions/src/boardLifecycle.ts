import {
  onSchedule,
} from "firebase-functions/v2/scheduler";

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

const TERMINAL_STATUSES =
  new Set([
    "expired",
    "archived",
    "cancelled",
    "rejected",
  ]);

export const finalizeExpiredBoards =
  onSchedule(
    {
      region: "asia-south1",
      schedule: "every 60 minutes",
      timeZone: "UTC",
    },
    async () => {
      const nowIso =
        new Date().toISOString();

      const snapshot =
        await db
          .collection("boards")
          .where(
            "endsAt",
            "<=",
            nowIso,
          )
          .limit(100)
          .get();

      for (const boardDocument of snapshot.docs) {
        const boardRef =
          boardDocument.ref;

        const auditRef =
          db
            .collection("auditEvents")
            .doc(
              `board_expired_${boardDocument.id}`,
            );

        await db.runTransaction(
          async (transaction) => {
            const current =
              await transaction.get(
                boardRef,
              );

            if (!current.exists) {
              return;
            }

            const board =
              current.data();

            const status =
              String(
                board?.status ?? "",
              );

            if (
              TERMINAL_STATUSES.has(
                status,
              )
            ) {
              return;
            }

            const endsAt =
              String(
                board?.endsAt ?? "",
              );

            const endsAtMs =
              Date.parse(endsAt);

            if (
              !endsAt ||
              Number.isNaN(endsAtMs) ||
              endsAtMs > Date.now()
            ) {
              return;
            }

            const now =
              FieldValue.serverTimestamp();

            transaction.update(
              boardRef,
              {
                status: "expired",
                expiredAt: now,
                finalRankingLockedAt: now,
                updatedAt: now,
              },
            );

            transaction.set(
              auditRef,
              {
                id: auditRef.id,
                type: "board_expired",
                boardId:
                  boardDocument.id,
                actorUserId: null,
                actorType: "system",
                previousStatus: status,
                createdAt: now,
              },
              {
                merge: false,
              },
            );
          },
        );
      }
    },
  );
