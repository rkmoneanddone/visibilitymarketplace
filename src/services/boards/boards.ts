import {
  dbQueryCollection,
  limit,
  orderBy,
  where,
} from "../../data/database/query";

import type {
  Board,
} from "../../types/board";

export async function getPublicBoards(): Promise<
  Board[]
> {
  return dbQueryCollection<Board>(
    "boards",
    [
      where(
        "status",
        "in",
        [
          "approved",
          "entry_open",
          "active",
        ],
      ),

      orderBy(
        "createdAt",
        "desc",
      ),

      limit(50),
    ],
  );
}