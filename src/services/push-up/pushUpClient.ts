import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import {
  firebaseApp,
} from "../../config/firebase";

export type CreatePushUpIntentInput = {
  listingId: string;
  amountMinor: number;
  currency?: string;
  boardPeriodId?: string;
};

export type CreatePushUpIntentResult = {
  success: boolean;
  boostId: string;
  status: "pending";
  amountMinor: number;
  currency: string;
  paymentRequired: boolean;
};

const functions =
  getFunctions(
    firebaseApp,
    "asia-south1",
  );

const createPushUpIntentCallable =
  httpsCallable<
    CreatePushUpIntentInput,
    CreatePushUpIntentResult
  >(
    functions,
    "createPushUpIntent",
  );

export async function createPushUpIntent(
  input: CreatePushUpIntentInput,
): Promise<CreatePushUpIntentResult> {
  const result =
    await createPushUpIntentCallable(
      input,
    );

  return result.data;
}
