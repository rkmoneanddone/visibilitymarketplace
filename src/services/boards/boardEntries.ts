import {
  dbGetDocument,
  dbQueryCollection,
  where,
} from "../../data/database";

import type {
  BoardEntry,
} from "../../types/board";

import type {
  Listing,
} from "../../types/marketplace";

export type BoardEntryWithListing = {
  entry: BoardEntry;
  listing: Listing;
};

export async function getBoardEntries(
  boardId: string,
): Promise<BoardEntryWithListing[]> {
  const entries =
    await dbQueryCollection<BoardEntry>(
      "boardEntries",
      [
        where(
          "boardId",
          "==",
          boardId,
        ),
        where(
          "status",
          "==",
          "entered",
        ),
      ],
    );

  const entered =
    entries.sort(
        (a, b) =>
          b.boostTotalMinor -
          a.boostTotalMinor,
      );

  const resolved =
    await Promise.all(
      entered.map(
        async (entry) => {
          const listing =
            await dbGetDocument<Listing>(
              "listings",
              entry.listingId,
            );

          if (!listing) {
            return null;
          }

          return {
            entry,
            listing,
          };
        },
      ),
    );

  return resolved.filter(
    (
      item,
    ): item is BoardEntryWithListing =>
      item !== null,
  );
}
