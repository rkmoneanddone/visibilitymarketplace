import {
  dbQueryCollection,
  limit,
  orderBy,
  where,
} from "../../data/database/query";

import type {
  Board,
} from "../../types/board";

export async function getRequestedBoards(
  max = 25,
): Promise<Board[]> {
  return dbQueryCollection<Board>(
    "boards",
    [
      where(
        "status",
        "==",
        "requested",
      ),

      orderBy(
        "createdAt",
        "desc",
      ),

      limit(max),
    ],
  );
}