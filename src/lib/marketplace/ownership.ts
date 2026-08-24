import type {
  Listing,
} from "../../types/marketplace";

export function isListingSubmitter(
  listing: Listing,
  userId: string,
): boolean {
  return listing.submittedByUserId === userId;
}

export function isVerifiedListingOwner(
  listing: Listing,
  userId: string,
): boolean {
  return (
    listing.ownershipStatus === "verified" &&
    listing.claimedOwnerUserId === userId
  );
}

export function canUserEditListing(
  listing: Listing,
  userId: string,
): boolean {
  if (
    isVerifiedListingOwner(
      listing,
      userId,
    )
  ) {
    return true;
  }

  if (
    listing.ownershipStatus === "unclaimed" &&
    isListingSubmitter(
      listing,
      userId,
    )
  ) {
    return true;
  }

  return false;
}

export function canUserArchiveListing(
  listing: Listing,
  userId: string,
): boolean {
  return canUserEditListing(
    listing,
    userId,
  );
}

export function canUserClaimListing(
  listing: Listing,
  userId: string,
): boolean {
  if (
    listing.ownershipStatus !== "unclaimed"
  ) {
    return false;
  }

  if (
    listing.claimedOwnerUserId === userId
  ) {
    return false;
  }

  return true;
}