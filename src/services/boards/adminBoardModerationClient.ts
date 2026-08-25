import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import {
  firebaseApp,
} from "../../config/firebase";

const functions =
  getFunctions(
    firebaseApp,
    "asia-south1",
  );

const approveBoardCallable =
  httpsCallable<
    {
      boardId: string;
    },
    {
      success: boolean;
      boardId: string;
    }
  >(
    functions,
    "approveBoard",
  );

const rejectBoardCallable =
  httpsCallable<
    {
      boardId: string;
      reason: string;
    },
    {
      success: boolean;
      boardId: string;
    }
  >(
    functions,
    "rejectBoard",
  );

export async function approveBoardAsAdmin(
  boardId: string,
) {
  const result =
    await approveBoardCallable({
      boardId,
    });

  return result.data;
}

export async function rejectBoardAsAdmin(
  boardId: string,
  reason: string,
) {
  const result =
    await rejectBoardCallable({
      boardId,
      reason,
    });

  return result.data;
}