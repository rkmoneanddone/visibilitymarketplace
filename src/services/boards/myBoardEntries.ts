import {
  dbQueryCollection,
  limit,
  where,
} from "../../data/database";

import type {
  BoardEntry,
} from "../../types/board";

export async function getMyBoardEntries(
  userId: string,
  pageSize = 100,
): Promise<BoardEntry[]> {
  const entries =
    await dbQueryCollection<BoardEntry>(
      "boardEntries",
      [
        where(
          "submittedByUserId",
          "==",
          userId,
        ),
        limit(pageSize),
      ],
    );

  return entries.filter(
    (entry) =>
      entry.status ===
        "pending_review" ||
      entry.status ===
        "pending_payment",
  );
}
