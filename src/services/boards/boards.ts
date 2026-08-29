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

import {
  withEffectiveBoardStatus,
} from "./boardLifecycle";

export async function getBoardById(
  boardId: string,
): Promise<Board | null> {
  const board =
    await dbGetDocument<Board>(
      "boards",
      boardId,
    );

  return board
    ? withEffectiveBoardStatus(
        board,
      )
    : null;
}

export async function getPublicBoards(): Promise<
  Board[]
> {
  const boards =
    await dbQueryCollection<Board>(
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

  return boards.map(
    withEffectiveBoardStatus,
  );
}
export async function getPublicBoardHistory(): Promise<
  Board[]
> {
  const boards =
    await dbQueryCollection<Board>(
      "boards",
      [
        where(
          "status",
          "in",
          [
            "approved",
            "entry_open",
            "active",
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

  return boards
    .map(
      withEffectiveBoardStatus,
    )
    .filter(
      (board) =>
        board.status ===
          "expired" ||
        board.status ===
          "archived",
    );
}
