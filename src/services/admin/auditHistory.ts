import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import {
  firebaseApp,
} from "../../config/firebase";

export type AdminAuditItem = {
  id: string;
  type: string;
  actorUserId: string | null;
  actorType: string | null;
  listingId: string | null;
  boardId: string | null;
  boardEntryId: string | null;
  paymentIntentId: string | null;
  createdAt: string | null;
  metadata: Record<string, unknown> | null;
};

type AuditResult = {
  success: boolean;
  items: AdminAuditItem[];
};

const functions =
  getFunctions(
    firebaseApp,
    "asia-south1",
  );

const getAuditCallable =
  httpsCallable<
    { limit?: number },
    AuditResult
  >(
    functions,
    "getAdminAuditHistory",
  );

export async function getAdminAuditHistory(
  limit?: number,
): Promise<AdminAuditItem[]> {
  const result =
    await getAuditCallable({
      ...(limit ? { limit } : {}),
    });

  return result.data.items;
}
