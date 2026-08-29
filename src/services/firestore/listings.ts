import {
  dbQueryCollection,
  limit,
  orderBy,
  where,
} from "../../data/database";

import type {
  Listing,
} from "../../types/marketplace";

const LISTINGS_COLLECTION = "listings";

export async function getPublishedListings(
  maxResults = 200,
): Promise<Listing[]> {
  const listings =
    await dbQueryCollection<Listing>(
      LISTINGS_COLLECTION,
      [
        where(
          "status",
          "==",
          "published",
        ),
        orderBy(
          "currentBoostTotalMinor",
          "desc",
        ),
        limit(maxResults),
      ],
    );

  return listings.filter(
    (listing) =>
      listing.visibilityScope !==
      "board_only",
  );
}
