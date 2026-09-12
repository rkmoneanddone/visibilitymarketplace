import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import {
  firebaseApp,
} from "../../config/firebase";

export type PaymentHistoryItem = {
  id: string;
  purpose: string;
  targetKind: string;
  targetId: string;
  description: string;
  amountMinor: number;
  currency: string;
  status: string;
  refundStatus: string | null;
  provider: string;
  providerPaymentId: string | null;
  createdAt: string | null;
  verifiedAt: string | null;
  fulfilledAt: string | null;
};

type PaymentHistoryResult = {
  success: boolean;
  items: PaymentHistoryItem[];
};

const functions =
  getFunctions(
    firebaseApp,
    "asia-south1",
  );

const getHistoryCallable =
  httpsCallable<
    { limit?: number },
    PaymentHistoryResult
  >(
    functions,
    "getMyPaymentHistory",
  );

export async function getMyPaymentHistory(
  limit?: number,
): Promise<PaymentHistoryItem[]> {
  const result =
    await getHistoryCallable({
      ...(limit ? { limit } : {}),
    });

  return result.data.items;
}
