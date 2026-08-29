import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import {
  db,
} from "../../data/database/client";

import type {
  BoardEntry,
} from "../../types/board";

import type {
  Listing,
} from "../../types/marketplace";

import {
  getPrimarySearchToken,
  matchesSearch,
} from "../search/searchTokens";

export type BoardEntryListingView =
  Pick<
    Listing,
    | "id"
    | "title"
    | "handle"
    | "featuredImageUrl"
    | "externalUrl"
    | "listingTypeId"
  >;

export type PagedBoardEntryItem = {
  entry: BoardEntry;
  listing: BoardEntryListingView;
};

export type BoardEntryPageCursor =
  QueryDocumentSnapshot<DocumentData> |
  null;

export type BoardEntryPageResult = {
  items: PagedBoardEntryItem[];
  cursor: BoardEntryPageCursor;
  hasMore: boolean;
};

function listingFromEntry(
  entry: BoardEntry,
): BoardEntryListingView | null {
  if (
    !entry.listingTitle ||
    !entry.listingExternalUrl ||
    !entry.listingTypeId
  ) {
    return null;
  }

  return {
    id:
      entry.listingId,

    title:
      entry.listingTitle,

    ...(entry.listingHandle
      ? {
          handle:
            entry.listingHandle,
        }
      : {}),

    ...(entry.listingFeaturedImageUrl
      ? {
          featuredImageUrl:
            entry.listingFeaturedImageUrl,
        }
      : {}),

    externalUrl:
      entry.listingExternalUrl,

    listingTypeId:
      entry.listingTypeId,
  };
}

async function hydrateEntry(
  entry: BoardEntry,
): Promise<
  PagedBoardEntryItem | null
> {
  const cached =
    listingFromEntry(
      entry,
    );

  if (cached) {
    return {
      entry,
      listing:
        cached,
    };
  }

  const listingSnap =
    await getDoc(
      doc(
        db,
        "listings",
        entry.listingId,
      ),
    );

  if (!listingSnap.exists()) {
    return null;
  }

  const listing = {
    id:
      listingSnap.id,
    ...listingSnap.data(),
  } as Listing;

  return {
    entry,
    listing: {
      id:
        listing.id,
      title:
        listing.title,
      handle:
        listing.handle,
      featuredImageUrl:
        listing.featuredImageUrl,
      externalUrl:
        listing.externalUrl,
      listingTypeId:
        listing.listingTypeId,
    },
  };
}

async function hydrateDocs(
  docs: QueryDocumentSnapshot<DocumentData>[],
): Promise<PagedBoardEntryItem[]> {
  const hydrated =
    await Promise.all(
      docs.map(
        (item) =>
          hydrateEntry({
            id:
              item.id,
            ...item.data(),
          } as BoardEntry),
      ),
    );

  return hydrated.filter(
    (
      item,
    ): item is PagedBoardEntryItem =>
      item !== null,
  );
}

export async function getBoardEntriesPage(
  boardId: string,
  cursor: BoardEntryPageCursor = null,
  pageSize = 20,
): Promise<BoardEntryPageResult> {
  const q =
    query(
      collection(
        db,
        "boardEntries",
      ),
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
      orderBy(
        "boostTotalMinor",
        "desc",
      ),
      ...(cursor
        ? [
            startAfter(
              cursor,
            ),
          ]
        : []),
      limit(
        pageSize,
      ),
    );

  const snapshot =
    await getDocs(q);

  return {
    items:
      await hydrateDocs(
        snapshot.docs,
      ),
    cursor:
      snapshot.docs.at(-1) ??
      null,
    hasMore:
      snapshot.docs.length ===
      pageSize,
  };
}

export async function searchBoardEntries(
  boardId: string,
  searchText: string,
  maxResults = 20,
): Promise<PagedBoardEntryItem[]> {
  const token =
    getPrimarySearchToken(
      searchText,
    );

  if (!token) {
    return [];
  }

  const q =
    query(
      collection(
        db,
        "boardEntries",
      ),
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
      where(
        "searchTokens",
        "array-contains",
        token,
      ),
      limit(
        maxResults,
      ),
    );

  const snapshot =
    await getDocs(q);

  const hydrated =
    await hydrateDocs(
      snapshot.docs,
    );

  return hydrated.filter(
    (item) =>
      matchesSearch(
        searchText,
        item.listing.title,
        item.listing.handle,
      ),
  );
}
