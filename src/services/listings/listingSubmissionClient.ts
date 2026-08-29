import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import {
  firebaseApp,
} from "../../config/firebase";

export type PrepareListingSubmissionResult = {
  success: boolean;
  listingId: string;
  status:
    | "payment_pending"
    | "submitted"
    | "under_review"
    | "published";
  paymentRequired: boolean;
  amountMinor: number;
  currency: string;
};

const functions =
  getFunctions(
    firebaseApp,
    "asia-south1",
  );

const prepareListingSubmissionCallable =
  httpsCallable<
    {
      listingId: string;
    },
    PrepareListingSubmissionResult
  >(
    functions,
    "prepareListingSubmission",
  );

export async function prepareListingSubmission(
  listingId: string,
): Promise<PrepareListingSubmissionResult> {
  const result =
    await prepareListingSubmissionCallable({
      listingId,
    });

  return result.data;
}
