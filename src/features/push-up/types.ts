import type {
  Listing,
} from "../../types/marketplace";

import {
  initialListingTypes,
} from "../../config/listingTypes";

export type PushUpTarget = {
  id: string;

  paymentTargetKind:
    | "listing"
    | "board_entry";

  paymentTargetId: string;

  purpose:
    | "listing_push"
    | "board_entry_push";

  title: string;

  handle?: string;

  imageUrl?: string;

  currentBoostTotalMinor: number;

  minimumAmountMinor: number;

  currency: string;
};

export function listingToPushUpTarget(
  listing: Listing,
): PushUpTarget {
  const listingType =
    initialListingTypes.find(
      (type) =>
        type.id ===
        listing.listingTypeId,
    );

  const minimumAmountMinor =
    listingType?.minimumBoostMinor ??
    100;

  return {
    id:
      listing.id,

    paymentTargetKind:
      "listing",

    paymentTargetId:
      listing.id,

    purpose:
      "listing_push",

    title:
      listing.title,

    handle:
      listing.handle,

    imageUrl:
      listing.featuredImageUrl,

    currentBoostTotalMinor:
      listing.currentBoostTotalMinor,

    minimumAmountMinor,

    currency:
      "USD",
  };
}
