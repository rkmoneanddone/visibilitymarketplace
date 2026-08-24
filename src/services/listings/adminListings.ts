import {
  dbQueryCollection,
  limit,
  orderBy,
  where,
} from "../../data/database";

import type {
  Listing,
} from "../../types/marketplace";

const LISTINGS_COLLECTION =
  "listings";

export async function getPendingListings(
  pageSize = 25,
): Promise<Listing[]> {
  return dbQueryCollection<Listing>(
    LISTINGS_COLLECTION,
    [
      where(
        "status",
        "in",
        [
          "submitted",
          "under_review",
        ],
      ),
      orderBy(
        "createdAt",
        "desc",
      ),
      limit(pageSize),
    ],
  );
}