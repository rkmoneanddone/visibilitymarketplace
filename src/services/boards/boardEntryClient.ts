import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import {
  firebaseApp,
} from "../../config/firebase";

type CreateBoardEntryIntentInput = {
  boardId: string;
  listingId: string;
};

type CreateBoardEntryIntentResult = {
  success: boolean;
  boardEntryId: string;
  status: "pending_payment";
  paymentRequired: boolean;
};

const functions =
  getFunctions(
    firebaseApp,
    "asia-south1",
  );

const createBoardEntryIntentCallable =
  httpsCallable<
    CreateBoardEntryIntentInput,
    CreateBoardEntryIntentResult
  >(
    functions,
    "createBoardEntryIntent",
  );

export async function createBoardEntryIntent(
  input: CreateBoardEntryIntentInput,
): Promise<CreateBoardEntryIntentResult> {
  const result =
    await createBoardEntryIntentCallable(
      input,
    );

  return result.data;
}
