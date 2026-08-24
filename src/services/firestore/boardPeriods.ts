import {
  dbQueryCollection,
  limit,
  orderBy,
  where,
} from "../../data/database";

import type {
  BoardPeriod,
} from "../../types/marketplace";

const BOARD_PERIODS_COLLECTION =
  "boardPeriods";

export async function getActiveBoardPeriod():
  Promise<BoardPeriod | null> {
  const results =
    await dbQueryCollection<BoardPeriod>(
      BOARD_PERIODS_COLLECTION,
      [
        where(
          "status",
          "==",
          "active",
        ),
        orderBy(
          "startsAt",
          "desc",
        ),
        limit(1),
      ],
    );

  return results[0] ?? null;
}