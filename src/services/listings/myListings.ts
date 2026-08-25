import {
  dbQueryCollection,
  limit,
  where,
} from "../../data/database";

import type {
  Listing,
} from "../../types/marketplace";

const LISTINGS_COLLECTION =
  "listings";

export async function getMyListings(
  userId: string,
  pageSize = 50,
): Promise<Listing[]> {
  const listings =
    await dbQueryCollection<Listing>(
      LISTINGS_COLLECTION,
      [
        where(
          "submittedByUserId",
          "==",
          userId,
        ),
        limit(pageSize),
      ],
    );

  return [...listings].sort(
    (a, b) =>
      String(b.createdAt).localeCompare(
        String(a.createdAt),
      ),
  );
}