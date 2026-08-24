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
  maxResults = 50,
): Promise<Listing[]> {
  return dbQueryCollection<Listing>(
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
}