import {
  dbGetDocument,
  dbQueryCollection,
  limit,
  orderBy,
  where,
} from "../../data/database/query";

import type {
  Board,
} from "../../types/board";

export async function getBoardById(
  boardId: string,
): Promise<Board | null> {
  return dbGetDocument<Board>(
    "boards",
    boardId,
  );
}

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
export async function getPublicBoardHistory(): Promise<
  Board[]
> {
  return dbQueryCollection<Board>(
    "boards",
    [
      where(
        "status",
        "in",
        [
          "expired",
          "archived",
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
