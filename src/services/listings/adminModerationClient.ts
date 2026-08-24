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

type PublishListingInput = {
  listingId: string;
};

type PublishListingResult = {
  success: boolean;
  listingId: string;
};

type RejectListingInput = {
  listingId: string;
  reason: string;
};

type RejectListingResult = {
  success: boolean;
  listingId: string;
};

const rejectListingCallable =
  httpsCallable<
    RejectListingInput,
    RejectListingResult
  >(
    functions,
    "rejectListing",
  );

export async function rejectListingAsAdmin(
  listingId: string,
  reason: string,
): Promise<RejectListingResult> {
  const result =
    await rejectListingCallable({
      listingId,
      reason,
    });

  return result.data;
}

const publishListingCallable =
  httpsCallable<
    PublishListingInput,
    PublishListingResult
  >(
    functions,
    "publishListing",
  );

export async function publishListingAsAdmin(
  listingId: string,
): Promise<PublishListingResult> {
  const result =
    await publishListingCallable({
      listingId,
    });

  return result.data;
}