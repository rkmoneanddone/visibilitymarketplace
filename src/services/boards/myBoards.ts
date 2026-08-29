import {
  dbQueryCollection,
  where,
} from "../../data/database/query";

import type {
  Board,
} from "../../types/board";

export async function getMyBoards(
  userId: string,
): Promise<Board[]> {
  const boards =
    await dbQueryCollection<Board>(
      "boards",
      [
        where(
          "createdByUserId",
          "==",
          userId,
        ),
      ],
    );

  return boards.sort(
    (a, b) =>
      new Date(
        b.createdAt,
      ).getTime() -
      new Date(
        a.createdAt,
      ).getTime(),
  );
}
