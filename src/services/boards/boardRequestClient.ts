import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import {
  firebaseApp,
} from "../../config/firebase";

type RequestBoardInput = {
  name: string;
  shortDescription: string;

  eligibleListingTypeIds: string[];

  categoryId?: string;
  subcategoryId?: string;

  startsAt: string;
  entryClosesAt: string;
  endsAt: string;

  entryFeeMinor: number;
  minimumBoostMinor: number;

  currency: string;
};

type RequestBoardResult = {
  success: boolean;
  boardId: string;
};

const functions =
  getFunctions(
    firebaseApp,
    "asia-south1",
  );

const requestBoardCallable =
  httpsCallable<
    RequestBoardInput,
    RequestBoardResult
  >(
    functions,
    "requestBoard",
  );

export async function requestBoard(
  input: RequestBoardInput,
): Promise<RequestBoardResult> {
  const result =
    await requestBoardCallable(
      input,
    );

  return result.data;
}