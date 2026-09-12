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

export const lockBoardRulesOnFirstEntry =
  onDocumentUpdated(
    {
      document:
        "boardEntries/{boardEntryId}",
      region: "asia-south1",
    },
    async (event) => {
      const before =
        event.data?.before.data();
      const after =
        event.data?.after.data();

      if (!before || !after) {
        return;
      }

      if (
        before.status === "entered" ||
        after.status !== "entered"
      ) {
        return;
      }

      const boardId =
        String(after.boardId ?? "").trim();

      if (!boardId) {
        return;
      }

      const boardRef =
        db.collection("boards").doc(boardId);

      const auditRef =
        db
          .collection("auditEvents")
          .doc(`board_rules_locked_${boardId}`);

      await db.runTransaction(
        async (transaction) => {
          const boardSnap =
            await transaction.get(boardRef);

          if (!boardSnap.exists) {
            return;
          }

          const board = boardSnap.data();

          if (board?.rulesLockedAt) {
            return;
          }

          const now =
            FieldValue.serverTimestamp();

          const lockedRules = {
            activationFeeMinor:
              Number(board?.activationFeeMinor ?? 0),
            entryFeeMinor:
              Number(board?.entryFeeMinor ?? 0),
            minimumBoostMinor:
              Number(board?.minimumBoostMinor ?? 0),
            currency:
              String(board?.currency ?? "USD"),
            listingTypeId:
              String(board?.listingTypeId ?? ""),
            startsAt:
              String(board?.startsAt ?? ""),
            entryStartsAt:
              String(board?.entryStartsAt ?? ""),
            entryClosesAt:
              String(board?.entryClosesAt ?? ""),
            endsAt:
              String(board?.endsAt ?? ""),
          };

          transaction.update(
            boardRef,
            {
              rulesLockedAt: now,
              rulesLockedByEntryId:
                event.params.boardEntryId,
              lockedRules,
              updatedAt: now,
            },
          );

          transaction.set(
            auditRef,
            {
              id: auditRef.id,
              type: "board_rules_locked",
              boardId,
              boardEntryId:
                event.params.boardEntryId,
              actorType: "system",
              actorUserId: null,
              lockedRules,
              createdAt: now,
            },
          );
        },
      );
    },
  );
