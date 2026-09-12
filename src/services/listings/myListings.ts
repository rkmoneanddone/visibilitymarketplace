import {
  dbQueryCollection,
  limit,
  orderBy,
  where,
} from "../../data/database";

import type {
  Listing,
} from "../../types/marketplace";

import {
  getPublicRuntimeConfig,
} from "../config/runtimeConfig";

const LISTINGS_COLLECTION =
  "listings";

export async function getMyListings(
  userId: string,
  pageSize?: number,
): Promise<Listing[]> {
  const config =
    await getPublicRuntimeConfig();

  const configuredLimit =
    config.limits.dashboardPageSize;

  const safeLimit =
    Number.isSafeInteger(pageSize)
      ? Math.min(
          Math.max(pageSize ?? 1, 1),
          configuredLimit,
        )
      : configuredLimit;

  return dbQueryCollection<Listing>(
    LISTINGS_COLLECTION,
    [
      where(
        "submittedByUserId",
        "==",
        userId,
      ),
      orderBy(
        "createdAt",
        "desc",
      ),
      limit(safeLimit),
    ],
  );
}
