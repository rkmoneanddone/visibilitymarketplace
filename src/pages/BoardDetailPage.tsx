import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  ExternalLink,
  Flame,
  LayoutGrid,
  Search,
} from "lucide-react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  BoardEntryLauncher,
} from "../features/boards/BoardEntryLauncher";

import {
  PushUpLauncher,
} from "../features/push-up/PushUpLauncher";

import type {
  PushUpTarget,
} from "../features/push-up/types";

import {
  getListingTypeName,
} from "../lib/marketplace/listing";

import {
  formatMoneyMinor,
} from "../lib/marketplace/money";

import {
  getBoardById,
} from "../services/boards/boards";

import {
  getBoardEntriesPage,
  searchBoardEntries,
  type BoardEntryPageCursor,
  type PagedBoardEntryItem,
} from "../services/boards/pagedBoardEntries";

import {
  matchesSearch,
} from "../services/search/searchTokens";


import type {
  Board,
} from "../types/board";


import {
  recordExternalClick,
} from "../services/analytics/clickTracking";
import "./board-detail.css";

function formatDate(value: string) {
  return new Date(value).toLocaleString(
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

function getEntryState(
  board: Board,
) {
  const now = Date.now();

  const entryStarts =
    new Date(
      board.entryStartsAt,
    ).getTime();

  const entryCloses =
    new Date(
      board.entryClosesAt,
    ).getTime();

  const ends =
    new Date(
      board.endsAt,
    ).getTime();

  if (
    board.status === "archived" ||
    board.status === "expired" ||
    now >= ends
  ) {
    return {
      label: "Board finished",
      detail:
        "Final results only. No new entries or Push Ups.",
      canEnter: false,
    };
  }

  if (now < entryStarts) {
    return {
      label: "Entry opens soon",
      detail:
        `Opens ${formatDate(
          board.entryStartsAt,
        )}`,
      canEnter: false,
    };
  }

  if (now >= entryCloses) {
    return {
      label: "Entry closed",
      detail:
        "No new listings can enter this Board.",
      canEnter: false,
    };
  }

  return {
    label: "Entry open",
    detail:
      "Eligible published listings can enter now.",
    canEnter: true,
  };
}

export function BoardDetailPage() {

  const { boardId } =
    useParams<{
      boardId: string;
    }>();

  const [board, setBoard] =
    useState<Board | null>(null);

  const [entries, setEntries] =
    useState<
      PagedBoardEntryItem[]
    >([]);

  const [
    entryCursor,
    setEntryCursor,
  ] =
    useState<BoardEntryPageCursor>(
      null,
    );

  const [
    hasMoreEntries,
    setHasMoreEntries,
  ] =
    useState(false);

  const [
    loadingMoreEntries,
    setLoadingMoreEntries,
  ] =
    useState(false);

  const [
    entrySearch,
    setEntrySearch,
  ] =
    useState("");

  const [
    dbEntrySearchResults,
    setDbEntrySearchResults,
  ] =
    useState<
      PagedBoardEntryItem[]
    >([]);

  const [
    searchingAllEntries,
    setSearchingAllEntries,
  ] =
    useState(false);

  const entrySearchCache =
    useRef<
      Map<
        string,
        PagedBoardEntryItem[]
      >
    >(
      new Map(),
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);


  useEffect(() => {
    let active = true;

    async function loadBoard() {
      if (!boardId) {
        setError(
          "Board not found.",
        );
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const boardResult =
          await getBoardById(
            boardId,
          );

        if (!active) {
          return;
        }

        if (!boardResult) {
          setError(
            "This board could not be found.",
          );
          return;
        }

        setBoard(
          boardResult,
        );

        try {
          const entryResult =
            await getBoardEntriesPage(
              boardId,
              null,
              20,
            );

          if (!active) {
            return;
          }

          setEntries(
            entryResult.items,
          );

          setEntryCursor(
            entryResult.cursor,
          );

          setHasMoreEntries(
            entryResult.hasMore,
          );
        } catch (entryError) {
          console.warn(
            "Board loaded but entries could not be loaded:",
            entryError,
          );

          if (active) {
            setEntries([]);
          }
        }
      } catch (error) {
        console.error(
          "Failed to load board:",
          error,
        );

        if (active) {
          setError(
            "Unable to load this board right now.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadBoard();

    return () => {
      active = false;
    };
  }, [
    boardId,
  ]);

  useEffect(() => {
    const query =
      entrySearch
        .trim()
        .toLowerCase();

    setDbEntrySearchResults(
      [],
    );

    if (
      !boardId ||
      query.length < 2
    ) {
      setSearchingAllEntries(
        false,
      );
      return;
    }

    const localMatches =
      entries.filter(
        (item) =>
          matchesSearch(
            query,
            item.listing.title,
            item.listing.handle,
          ),
      );

    if (
      localMatches.length >
      0
    ) {
      setSearchingAllEntries(
        false,
      );
      return;
    }

    const cacheKey =
      `${boardId}:${query}`;

    const cached =
      entrySearchCache
        .current
        .get(
          cacheKey,
        );

    if (cached) {
      setDbEntrySearchResults(
        cached,
      );
      setSearchingAllEntries(
        false,
      );
      return;
    }

    let cancelled =
      false;

    const timer =
      window.setTimeout(
        () => {
          setSearchingAllEntries(
            true,
          );

          void searchBoardEntries(
            boardId,
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

                entrySearchCache
                  .current
                  .set(
                    cacheKey,
                    result,
                  );

                setDbEntrySearchResults(
                  result,
                );
              },
            )
            .catch(
              (searchError) => {
                console.error(
                  "Board listing search failed:",
                  searchError,
                );
              },
            )
            .finally(
              () => {
                if (
                  !cancelled
                ) {
                  setSearchingAllEntries(
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
    boardId,
    entries,
    entrySearch,
  ]);

  async function loadMoreEntries() {
    if (
      !boardId ||
      !entryCursor ||
      !hasMoreEntries ||
      loadingMoreEntries
    ) {
      return;
    }

    try {
      setLoadingMoreEntries(
        true,
      );

      const result =
        await getBoardEntriesPage(
          boardId,
          entryCursor,
          20,
        );

      setEntries(
        (current) => [
          ...current,
          ...result.items.filter(
            (nextItem) =>
              !current.some(
                (currentItem) =>
                  currentItem.entry.id ===
                  nextItem.entry.id,
              ),
          ),
        ],
      );

      setEntryCursor(
        result.cursor,
      );

      setHasMoreEntries(
        result.hasMore,
      );
    } catch (loadError) {
      console.error(
        "Failed to load more Board listings:",
        loadError,
      );
    } finally {
      setLoadingMoreEntries(
        false,
      );
    }
  }

  const entryState =
    useMemo(
      () =>
        board
          ? getEntryState(
              board,
            )
          : null,
      [
        board,
      ],
    );


  if (loading) {
    return (
      <main className="board-detail-page">
        <div className="board-detail-state">
          Loading board...
        </div>
      </main>
    );
  }

  if (
    error ||
    !board ||
    !entryState
  ) {
    return (
      <main className="board-detail-page">
        <div className="board-detail-state">
          <p>
            {error ??
              "Board not found."}
          </p>

          <Link to="/boards">
            Back to Boards
          </Link>
        </div>
      </main>
    );
  }

  const query =
    entrySearch
      .trim()
      .toLowerCase();

  const localEntryMatches =
    query
      ? entries.filter(
          (item) =>
            matchesSearch(
              query,
              item.listing.title,
              item.listing.handle,
            ),
        )
      : entries;

  const displayEntries =
    query &&
    localEntryMatches.length === 0
      ? dbEntrySearchResults
      : localEntryMatches;
  return (
    <main className="board-detail-page">

      <Link
        className="board-detail-back"
        to="/boards"
      >
        <ArrowLeft size={14} />
        Boards
      </Link>

      <section className="board-detail-card board-summary board-event-hero">
        <div className="board-event-glow" />

        <div className="board-summary-row board-summary-row-main">
          <div className="board-summary-identity">
            <p className="board-detail-kicker board-live-kicker">
              <Flame size={13} />
              {entryState.canEnter
                ? "LIVE BOARD"
                : "BOARD"}
            </p>

            <h1>
              {board.name}
            </h1>

            <p className="board-summary-meta">
              {getListingTypeName(
                board.listingTypeId,
              )}

              <span>
                {"\u00B7"}
              </span>

              {getStatusLabel(
                board.status,
              )}

              <span>
                {"\u00B7"}
              </span>

              {hasMoreEntries
                ? `${entries.length}+ entries`
                : `${entries.length} entries`}
            </p>
          </div>

          <div className="board-summary-prices board-summary-prices-top">
            <span>
              <small>Entry</small>

              <strong>
                {formatMoneyMinor(
                  board.entryFeeMinor,
                  board.currency,
                )}
              </strong>
            </span>

            <span>
              <small>
                Push from
              </small>

              <strong>
                {formatMoneyMinor(
                  board.minimumBoostMinor,
                  board.currency,
                )}
              </strong>
            </span>
          </div>

          {entryState.canEnter ? (
            <BoardEntryLauncher
              board={board}
            >
              {(openEntry) => (
                <button
                  className="board-entry-link"
                  type="button"
                  onClick={openEntry}
                >
                  {`Enter This Board - ${formatMoneyMinor(
                    board.entryFeeMinor,
                    board.currency,
                  )}`}
                </button>
              )}
            </BoardEntryLauncher>
          ) : (
            <button
              className="board-entry-link"
              type="button"
              disabled
            >
              {entryState.label}
            </button>
          )}
        </div>
      </section>

      <section
        id="board-schedule"
        className="board-detail-card board-schedule-card"
      >
        <div className="board-section-title">
          <CalendarDays size={15} />

          <h2>
            Schedule
          </h2>
        </div>

        <dl className="board-schedule-grid">
          <div>
            <dt>Starts</dt>
            <dd>
              {formatDate(
                board.startsAt,
              )}
            </dd>
          </div>

          <div>
            <dt>Entry starts</dt>
            <dd>
              {formatDate(
                board.entryStartsAt,
              )}
            </dd>
          </div>

          <div>
            <dt>Ends</dt>
            <dd>
              {formatDate(
                board.endsAt,
              )}
            </dd>
          </div>

          <div>
            <dt>Entry closes</dt>
            <dd>
              {formatDate(
                board.entryClosesAt,
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section
        id="board-entries"
        className="board-detail-card board-entries-card"
      >
        <div className="board-entries-heading">
          <div>
            <span>LEADERBOARD</span>

            <h2>
              Listings in this Board
            </h2>
          </div>

          <div className="board-entry-search-wrap">
            <label className="board-entry-search">
              <Search size={15} />

              <input
                type="search"
                value={entrySearch}
                onChange={(event) =>
                  setEntrySearch(
                    event.target.value,
                  )
                }
                placeholder="Search title or @handle"
              />
            </label>

            {searchingAllEntries && (
              <small className="board-entry-search-note">
                Searching all Board listings...
              </small>
            )}

            <small>
              Entry fee does not affect ranking.
            </small>
          </div>
        </div>

        {displayEntries.length > 0 ? (
          <div className="board-entry-leaderboard">
            {displayEntries.map(
              (
                item,
              ) => {
                const loadedIndex =
                  entries.findIndex(
                    (loadedItem) =>
                      loadedItem.entry.id ===
                      item.entry.id,
                  );

                const rank =
                  loadedIndex >= 0
                    ? loadedIndex + 1
                    : null;

                return (
                  <article
                    className={
                      rank
                        ? `board-entry-row board-entry-rank-${Math.min(
                            rank,
                            3,
                          )}`
                        : "board-entry-row"
                    }
                    key={
                      item.entry.listingId
                    }
                  >
                    <span className="board-entry-rank">
                      {rank
                        ? `#${rank}`
                        : "-"}
                    </span>

                    <span className="board-entry-avatar">
                      {item.listing
                        .featuredImageUrl ? (
                        <img
                          src={
                            item.listing
                              .featuredImageUrl
                          }
                          alt=""
                        />
                      ) : (
                        item.listing.title
                          .charAt(0)
                          .toUpperCase()
                      )}
                    </span>

                    <span className="board-entry-identity">
                      <strong>
                        {item.listing.title}
                      </strong>

                      {item.listing
                        .handle && (
                        <small>
                          {
                            item.listing
                              .handle
                          }
                        </small>
                      )}
                    </span>

                    <span className="board-entry-boost">
                      <strong>
                        {formatMoneyMinor(
                          item.entry
                            .boostTotalMinor,
                          board.currency,
                        )}
                      </strong>

                      <small>
                        pushed
                      </small>
                    </span>

                    <span className="board-entry-actions">
                      <a
                        href={
                          item.listing
                            .externalUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        onClick={() =>
                          void recordExternalClick(
                            "board_entry",
                            `${item.entry.boardId}_${item.entry.listingId}`,
                          )
                        }
                      >
                        <ExternalLink
                          size={13}
                          strokeWidth={2}
                        />
                        Visit
                      </a>
                      <span className="board-entry-clicks">
                        {item.entry.externalClicks ?? 0} clicks
                      </span>

                      {entryState.canEnter ||
                      Date.now() <
                        new Date(
                          board.endsAt,
                        ).getTime() ? (
                        <PushUpLauncher
                          targets={[
                            {
                              id:
                                item.entry.listingId,

                              paymentTargetKind:
                                "board_entry",

                              paymentTargetId:
                                `${item.entry.boardId}_${item.entry.listingId}`,

                              purpose:
                                "board_entry_push",

                              title:
                                item.listing.title,

                              handle:
                                item.listing.handle,

                              imageUrl:
                                item.listing.featuredImageUrl,

                              currentBoostTotalMinor:
                                item.entry.boostTotalMinor,

                              minimumAmountMinor:
                                board.minimumBoostMinor,

                              currency:
                                board.currency,
                            } satisfies PushUpTarget,
                          ]}
                          initialTargetId={
                            item.entry.listingId
                          }
                          contextLabel={board.name}
                        >
                          {(openPushUp) => (
                            <button
                              type="button"
                              onClick={
                                openPushUp
                              }
                            >
                              <ArrowUp
                                size={13}
                              />
                              Push Up
                            </button>
                          )}
                        </PushUpLauncher>
                      ) : (
                        <span className="board-entry-final-label">
                          Final
                        </span>
                      )}
                    </span>
                  </article>
                );
              },
            )}
          </div>
        ) : (
          <div className="board-empty-row">
            <LayoutGrid size={22} />

            <strong>
              First listings will appear here
            </strong>

            <p>
              Only paid, verified Board entries
              will appear in this leaderboard.
            </p>
          </div>
        )}

        {!entrySearch.trim() &&
          hasMoreEntries && (
            <div className="board-entry-load-more-wrap">
              <button
                className="board-entry-load-more"
                type="button"
                disabled={
                  loadingMoreEntries
                }
                onClick={() =>
                  void loadMoreEntries()
                }
              >
                {loadingMoreEntries
                  ? "Loading..."
                  : "Load More"}
              </button>
            </div>
          )}
      </section>
    </main>
  );
}
