import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowRight,
  Search,
  Share2,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import {
  getListingTypeName,
} from "../lib/marketplace/listing";

import {
  getBoardsPage,
  searchBoards,
  type BoardPageCursor,
} from "../services/boards/pagedBoards";

import {
  matchesSearch,
} from "../services/search/searchTokens";

import type {
  Board,
} from "../types/board";

import {
  formatMoneyMinor,
} from "../lib/marketplace/money";

import "./boards.css";

import {
  BoardEntryLauncher,
} from "../features/boards/BoardEntryLauncher";

function formatBoardDate(
  value: string,
) {
  return new Date(
    value,
  ).toLocaleString(
    undefined,
    {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    },
  );
}

function getStatusLabel(
  status: Board["status"],
) {
  return status
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (value) =>
        value.toUpperCase(),
    );
}

function isBoardClosed(
  board: Board,
): boolean {
  if (
    board.status === "expired" ||
    board.status === "archived"
  ) {
    return true;
  }

  const endsAt =
    new Date(
      board.endsAt,
    ).getTime();

  return (
    !Number.isNaN(endsAt) &&
    Date.now() >= endsAt
  );
}

function getBoardEntryWindowState(
  board: Board,
):
  | "upcoming"
  | "open"
  | "closed" {
  const now =
    Date.now();

  const entryStartsAt =
    new Date(
      board.entryStartsAt,
    ).getTime();

  const entryClosesAt =
    new Date(
      board.entryClosesAt,
    ).getTime();

  if (
    Number.isNaN(entryStartsAt) ||
    Number.isNaN(entryClosesAt)
  ) {
    return "closed";
  }

  if (now < entryStartsAt) {
    return "upcoming";
  }

  if (now >= entryClosesAt) {
    return "closed";
  }

  return "open";
}

function boardSortTime(
  board: Board,
): number {
  const value =
    new Date(
      board.endsAt ||
        board.createdAt,
    ).getTime();

  return Number.isNaN(value)
    ? 0
    : value;
}

async function shareBoard(
  board: Board,
) {
  const boardUrl =
    `${window.location.origin}/boards/${board.id}`;

  const shareData = {
    title:
      board.name,
    text:
      `${board.name} on Visibility Marketplace`,
    url:
      boardUrl,
  };

  try {
    if (navigator.share) {
      await navigator.share(
        shareData,
      );
      return;
    }

    await navigator.clipboard.writeText(
      boardUrl,
    );
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      return;
    }

    console.error(
      "Unable to share board:",
      error,
    );
  }
}

type BoardCardProps = {
  board: Board;
  closed: boolean;
};

function BoardCard({
  board,
  closed,
}: BoardCardProps) {
  const entryWindowState =
    getBoardEntryWindowState(
      board,
    );

  return (
    <article
      className={
        closed
          ? "board-card board-card-closed"
          : "board-card"
      }
    >
      <div className="board-card-top">
        <div className="board-card-copy">
          <h2>
            {board.name}
          </h2>

          <p>
            {getListingTypeName(
              board.listingTypeId,
            )}
          </p>
        </div>

        <span
          className={
            closed
              ? "board-status board-status-closed"
              : `board-status board-status-${board.status}`
          }
        >
          {closed
            ? "Closed"
            : getStatusLabel(
                board.status,
              )}
        </span>
      </div>

      <div className="board-card-timing">
        {closed ? (
          <>
            <span>
              Started{" "}
              <strong>
                {formatBoardDate(
                  board.startsAt,
                )}
              </strong>
            </span>

            <span className="board-card-separator">
              |
            </span>

            <span>
              Closed{" "}
              <strong>
                {formatBoardDate(
                  board.endsAt,
                )}
              </strong>
            </span>
          </>
        ) : (
          <>
            <span>
              Entry closes{" "}
              <strong>
                {formatBoardDate(
                  board.entryClosesAt,
                )}
              </strong>
            </span>

            <span className="board-card-separator">
              |
            </span>

            <span>
              Ends{" "}
              <strong>
                {formatBoardDate(
                  board.endsAt,
                )}
              </strong>
            </span>
          </>
        )}
      </div>

      <div className="board-card-bottom">
        <div className="board-card-pricing">
          <span>
            <strong>
              {formatMoneyMinor(
                board.entryFeeMinor,
                board.currency,
              )}
            </strong>
            <small>
              Entry
            </small>
          </span>

          <span>
            <strong>
              {formatMoneyMinor(
                board.minimumBoostMinor,
                board.currency,
              )}
            </strong>
            <small>
              Push from
            </small>
          </span>
        </div>

        <div className="board-card-actions">
          <button
            className="board-share-button"
            type="button"
            onClick={() =>
              void shareBoard(
                board,
              )
            }
            aria-label={`Share ${board.name}`}
          >
            <Share2 size={15} />
          </button>

          {!closed &&
            entryWindowState === "open" && (
              <BoardEntryLauncher
                board={board}
              >
                {(openEntry) => (
                  <button
                    className="board-card-add-listing"
                    type="button"
                    onClick={openEntry}
                  >
                    Enter This Board
                  </button>
                )}
              </BoardEntryLauncher>
            )}

          {!closed &&
            entryWindowState !== "open" && (
              <button
                className="board-card-add-listing"
                type="button"
                disabled
              >
                {entryWindowState === "upcoming"
                  ? "Entry opens soon"
                  : "Entry closed"}
              </button>
            )}

          <Link
            className={
              closed
                ? "board-card-link board-card-final-link"
                : "board-card-link"
            }
            to={`/boards/${board.id}`}
          >
            {closed
              ? "View Final Ranking"
              : "View Board"}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function BoardsPage() {
  const [boards, setBoards] =
    useState<Board[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const [search, setSearch] =
    useState("");

  const [
    boardCursor,
    setBoardCursor,
  ] =
    useState<BoardPageCursor>(
      null,
    );

  const [
    hasMoreBoards,
    setHasMoreBoards,
  ] =
    useState(false);

  const [
    loadingMoreBoards,
    setLoadingMoreBoards,
  ] =
    useState(false);

  const [
    dbSearchBoards,
    setDbSearchBoards,
  ] =
    useState<Board[]>([]);

  const [
    searchingAllBoards,
    setSearchingAllBoards,
  ] =
    useState(false);

  const boardSearchCache =
    useRef<
      Map<string, Board[]>
    >(
      new Map(),
    );

  useEffect(() => {
    let active = true;

    async function loadBoards() {
      try {
        setLoading(true);
        setError(null);

        const result =
          await getBoardsPage(
            null,
            20,
          );

        if (active) {
          setBoards(
            result.items,
          );

          setBoardCursor(
            result.cursor,
          );

          setHasMoreBoards(
            result.hasMore,
          );
        }
      } catch (loadError) {
        console.error(
          "Failed to load boards:",
          loadError,
        );

        if (active) {
          setError(
            "Unable to load boards right now.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadBoards();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const query =
      search
        .trim()
        .toLowerCase();

    setDbSearchBoards([]);

    if (query.length < 2) {
      setSearchingAllBoards(
        false,
      );
      return;
    }

    const localMatches =
      boards.filter(
        (board) =>
          matchesSearch(
            query,
            board.name,
          ),
      );

    if (
      localMatches.length >
      0
    ) {
      setSearchingAllBoards(
        false,
      );
      return;
    }

    const cached =
      boardSearchCache
        .current
        .get(query);

    if (cached) {
      setDbSearchBoards(
        cached,
      );
      setSearchingAllBoards(
        false,
      );
      return;
    }

    let cancelled =
      false;

    const timer =
      window.setTimeout(
        () => {
          setSearchingAllBoards(
            true,
          );

          void searchBoards(
            query,
            20,
          )
            .then(
              (result) => {
                if (
                  cancelled
                ) {
                  return;
                }

                boardSearchCache
                  .current
                  .set(
                    query,
                    result,
                  );

                setDbSearchBoards(
                  result,
                );
              },
            )
            .catch(
              (searchError) => {
                console.error(
                  "Board search failed:",
                  searchError,
                );
              },
            )
            .finally(
              () => {
                if (
                  !cancelled
                ) {
                  setSearchingAllBoards(
                    false,
                  );
                }
              },
            );
        },
        500,
      );

    return () => {
      cancelled = true;
      window.clearTimeout(
        timer,
      );
    };
  }, [
    boards,
    search,
  ]);

  async function loadMoreBoards() {
    if (
      loadingMoreBoards ||
      !hasMoreBoards ||
      !boardCursor
    ) {
      return;
    }

    try {
      setLoadingMoreBoards(
        true,
      );

      const result =
        await getBoardsPage(
          boardCursor,
          20,
        );

      setBoards(
        (current) => {
          const merged =
            new Map<
              string,
              Board
            >();

          for (
            const board
            of [
              ...current,
              ...result.items,
            ]
          ) {
            merged.set(
              board.id,
              board,
            );
          }

          return Array.from(
            merged.values(),
          );
        },
      );

      setBoardCursor(
        result.cursor,
      );

      setHasMoreBoards(
        result.hasMore,
      );
    } catch (loadError) {
      console.error(
        "Failed to load more boards:",
        loadError,
      );
    } finally {
      setLoadingMoreBoards(
        false,
      );
    }
  }
  const {
    openBoards,
    closedBoards,
  } =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const localSearched =
        query
          ? boards.filter(
              (board) =>
                matchesSearch(
                  query,
                  board.name,
                ),
            )
          : boards;

      const searched =
        query &&
        localSearched.length === 0
          ? dbSearchBoards
          : localSearched;

      const open =
        searched
          .filter(
            (board) =>
              !isBoardClosed(
                board,
              ),
          )
          .sort(
            (a, b) =>
              boardSortTime(a) -
              boardSortTime(b),
          );

      const closed =
        searched
          .filter(
            (board) =>
              isBoardClosed(
                board,
              ),
          )
          .sort(
            (a, b) =>
              boardSortTime(b) -
              boardSortTime(a),
          );

      return {
        openBoards:
          open,
        closedBoards:
          closed,
      };
    }, [
      boards,
      dbSearchBoards,
      search,
    ]);

  const noResults =
    openBoards.length === 0 &&
    closedBoards.length === 0;

  return (
    <main className="boards-page">
      <header className="boards-header">
        <div>
          <p className="boards-kicker">
            BOARDS
          </p>

          <h1>
            Find a board
          </h1>

          <p className="boards-intro">
            Enter while open. Closed Boards keep their final ranking.
          </p>
        </div>

        <label className="boards-search">
          <Search size={16} />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search boards"
          />
        </label>

        {searchingAllBoards && (
          <span className="boards-search-note">
            Searching all Boards...
          </span>
        )}
      </header>

      {loading ? (
        <div className="boards-state">
          Loading boards...
        </div>
      ) : error ? (
        <div className="boards-state">
          {error}
        </div>
      ) : noResults ? (
        <div className="boards-state">
          No boards found.
        </div>
      ) : (
        <div className="boards-sections">
          {openBoards.length > 0 && (
            <section className="boards-group">
              <div className="boards-group-heading">
                <div className="boards-group-title">
                  <span>
                    OPEN BOARDS
                  </span>

                  <h2>
                    Compete now
                  </h2>

                  <small>
                    {openBoards.length} boards
                  </small>
                </div>
              </div>

              <div className="boards-list">
                {openBoards.map(
                  (board) => (
                    <BoardCard
                      key={board.id}
                      board={board}
                      closed={false}
                    />
                  ),
                )}
              </div>
            </section>
          )}

          {closedBoards.length > 0 && (
            <section className="boards-group boards-group-history">
              <div className="boards-group-heading">
                <div className="boards-group-title">
                  <span>
                    CLOSED BOARDS
                  </span>

                  <h2>
                    Past competitions
                  </h2>

                  <small>
                    {closedBoards.length} boards
                  </small>
                </div>
              </div>

              <div className="boards-list">
                {closedBoards.map(
                  (board) => (
                    <BoardCard
                      key={board.id}
                      board={board}
                      closed={true}
                    />
                  ),
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {!search.trim() &&
        hasMoreBoards &&
        !loading && (
          <div className="boards-load-more-wrap">
            <button
              className="boards-load-more"
              type="button"
              disabled={
                loadingMoreBoards
              }
              onClick={() =>
                void loadMoreBoards()
              }
            >
              {loadingMoreBoards
                ? "Loading..."
                : "Load More"}
            </button>
          </div>
        )}
    </main>
  );
}
