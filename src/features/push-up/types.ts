import type {
  Listing,
} from "../../types/marketplace";

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

    minimumAmountMinor:
      100,

    currency:
      "USD",
  };
}
