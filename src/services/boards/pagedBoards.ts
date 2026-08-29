import {
  collection,
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
  Board,
} from "../../types/board";

import {
  getPrimarySearchToken,
  matchesSearch,
} from "../search/searchTokens";

import {
  withEffectiveBoardStatus,
} from "./boardLifecycle";

const PUBLIC_STATUSES = [
  "approved",
  "entry_open",
  "active",
  "expired",
  "archived",
] as const;

export type BoardPageCursor =
  QueryDocumentSnapshot<DocumentData> |
  null;

export type BoardPageResult = {
  items: Board[];
  cursor: BoardPageCursor;
  hasMore: boolean;
};

export async function getBoardsPage(
  cursor: BoardPageCursor = null,
  pageSize = 20,
): Promise<BoardPageResult> {
  const constraints = [
    where(
      "status",
      "in",
      [...PUBLIC_STATUSES],
    ),
    orderBy(
      "createdAt",
      "desc",
    ),
  ];

  const q =
    query(
      collection(
        db,
        "boards",
      ),
      ...constraints,
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

  const items =
    snapshot.docs.map(
      (item) =>
        withEffectiveBoardStatus({
          id:
            item.id,
          ...item.data(),
        } as Board),
    );

  return {
    items,
    cursor:
      snapshot.docs.at(-1) ??
      null,
    hasMore:
      snapshot.docs.length ===
      pageSize,
  };
}

export async function searchBoards(
  searchText: string,
  maxResults = 20,
): Promise<Board[]> {
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
        "boards",
      ),
      where(
        "status",
        "in",
        [...PUBLIC_STATUSES],
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

  const boards =
    snapshot.docs.map(
      (item) =>
        withEffectiveBoardStatus({
          id:
            item.id,
          ...item.data(),
        } as Board),
    );

  return boards.filter(
    (board) =>
      matchesSearch(
        searchText,
        board.name,
      ),
  );
}
