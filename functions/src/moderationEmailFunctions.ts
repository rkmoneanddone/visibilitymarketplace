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
  type DocumentData,
} from "firebase-admin/firestore";

import {
  hostingerSmtpPassword,
  sendConfiguredEmail,
  type EmailTemplateKey,
} from "./mailer";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

type NotificationEvent = {
  templateKey: EmailTemplateKey;
  eventKey: string;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

async function userEmail(
  directEmail: unknown,
  userId: unknown,
): Promise<string | null> {
  const direct =
    text(directEmail).toLowerCase();

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(direct)) {
    return direct;
  }

  const uid = text(userId);

  if (!uid) {
    return null;
  }

  const snap =
    await db.collection("users").doc(uid).get();

  const email =
    text(snap.data()?.email).toLowerCase();

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}

async function sendOnce(
  id: string,
  recipient: string | null,
  event: NotificationEvent,
  variables: Record<string, string | number | null | undefined>,
) {
  const eventRef =
    db.collection("notificationEmailEvents").doc(id);

  const reserved =
    await db.runTransaction(
      async (transaction) => {
        const current =
          await transaction.get(eventRef);

        if (current.exists) {
          return false;
        }

        transaction.create(eventRef, {
          id,
          templateKey: event.templateKey,
          eventKey: event.eventKey,
          status: "pending",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        return true;
      },
    );

  if (!reserved) {
    return;
  }

  try {
    const result =
      await sendConfiguredEmail({
        to: recipient,
        templateKey: event.templateKey,
        variables,
      });

    await eventRef.set(
      {
        status: result.sent
          ? "sent"
          : "skipped",
        recipient: recipient || null,
        providerMessageId:
          result.providerMessageId || null,
        skippedReason:
          result.skippedReason || null,
        completedAt:
          FieldValue.serverTimestamp(),
        updatedAt:
          FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("Notification email failed", {
      id,
      templateKey: event.templateKey,
      error,
    });

    await eventRef.set(
      {
        status: "failed",
        error: String(
          error instanceof Error
            ? error.message
            : error,
        ).slice(0, 500),
        completedAt:
          FieldValue.serverTimestamp(),
        updatedAt:
          FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
}

function listingEvent(
  before: DocumentData,
  after: DocumentData,
): NotificationEvent | null {
  if (
    before.status !== "published" &&
    after.status === "published"
  ) {
    return {
      templateKey: "listingApproved",
      eventKey: "published",
    };
  }

  if (
    before.status !== "rejected" &&
    after.status === "rejected"
  ) {
    return {
      templateKey: "listingRejected",
      eventKey: "rejected",
    };
  }

  return null;
}

function boardEvent(
  before: DocumentData,
  after: DocumentData,
): NotificationEvent | null {
  if (
    before.status === "requested" &&
    after.status === "awaiting_activation_payment"
  ) {
    return {
      templateKey: "boardApproved",
      eventKey: "approved",
    };
  }

  if (
    before.status !== "rejected" &&
    after.status === "rejected"
  ) {
    return {
      templateKey: "boardRejected",
      eventKey: "rejected",
    };
  }

  if (
    before.activationPaymentStatus !== "paid" &&
    after.activationPaymentStatus === "paid"
  ) {
    return {
      templateKey: "boardActivated",
      eventKey: "activated",
    };
  }

  return null;
}

export const sendListingStatusEmail =
  onDocumentUpdated(
    {
      document: "listings/{listingId}",
      region: "asia-south1",
      secrets: [hostingerSmtpPassword],
    },
    async (event) => {
      const before = event.data?.before.data();
      const after = event.data?.after.data();

      if (!before || !after) {
        return;
      }

      const notification =
        listingEvent(before, after);

      if (!notification) {
        return;
      }

      const recipient =
        await userEmail(
          after.submittedByEmail,
          after.submittedByUserId,
        );

      await sendOnce(
        `listing_${event.params.listingId}_${notification.eventKey}`,
        recipient,
        notification,
        {
          listingId: event.params.listingId,
          listingTitle: text(after.title),
          rejectionReason:
            text(after.rejectionReason),
        },
      );
    },
  );

export const sendBoardStatusEmail =
  onDocumentUpdated(
    {
      document: "boards/{boardId}",
      region: "asia-south1",
      secrets: [hostingerSmtpPassword],
    },
    async (event) => {
      const before = event.data?.before.data();
      const after = event.data?.after.data();

      if (!before || !after) {
        return;
      }

      const notification =
        boardEvent(before, after);

      if (!notification) {
        return;
      }

      const recipient =
        await userEmail(
          after.createdByEmail,
          after.createdByUserId,
        );

      await sendOnce(
        `board_${event.params.boardId}_${notification.eventKey}`,
        recipient,
        notification,
        {
          boardId: event.params.boardId,
          boardName: text(after.name),
          rejectionReason:
            text(after.rejectionReason),
        },
      );
    },
  );
