import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
  LayoutGrid,
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
  getPublicBoards,
} from "../services/boards/boards";

import type {
  Board,
} from "../types/board";

import {
  formatMoneyMinor,
} from "../lib/marketplace/money";

import "./boards.css";

function formatBoardDate(value: string) {
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

function getStatusLabel(status: Board["status"]) {
  return status
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (value) => value.toUpperCase(),
    );
}

async function shareBoard(board: Board) {
  const boardUrl =
    `${window.location.origin}/boards/${board.id}`;

  const shareData = {
    title: board.name,
    text: `${board.name} on ViewBid`,
    url: boardUrl,
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

export function BoardsPage() {
  const [boards, setBoards] =
    useState<Board[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  useEffect(() => {
    let active = true;

    async function loadBoards() {
      try {
        setLoading(true);
        setError(null);

        const result =
          await getPublicBoards();

        if (active) {
          setBoards(result);
        }
      } catch (error) {
        console.error(
          "Failed to load boards:",
          error,
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

  const visibleBoards =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return boards;
      }

      return boards.filter(
        (board) =>
          board.name
            .toLowerCase()
            .includes(query),
      );
    }, [
      boards,
      search,
    ]);

  return (
    <main className="boards-page">
      <header className="boards-header">
        <div className="boards-heading">
          <p className="boards-kicker">
            <LayoutGrid size={13} />
            BOARDS
          </p>

          <h1>Find a board</h1>

          <p className="boards-intro">
            Join focused, time-limited visibility boards.
          </p>
        </div>

        <label className="boards-search">
          <Search size={16} />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search boards"
          />
        </label>
      </header>

      {loading ? (
        <div className="boards-state">
          Loading boards...
        </div>
      ) : error ? (
        <div className="boards-state">
          {error}
        </div>
      ) : visibleBoards.length === 0 ? (
        <div className="boards-state">
          No open boards found.
        </div>
      ) : (
        <div className="boards-list">
          {visibleBoards.map(
            (board) => (
              <article
                className="board-card"
                key={board.id}
              >
                <div className="board-card-row board-card-row-main">
                  <div className="board-card-identity">
                    <h2>
                      {board.name}
                    </h2>

                    <p>
                      {getListingTypeName(
                        board.listingTypeId,
                      )}
                    </p>
                  </div>

                  <div className="board-card-dates">
                    <span>
                      Entry closes
                      <strong>
                        {formatBoardDate(
                          board.entryClosesAt,
                        )}
                      </strong>
                    </span>

                    <span className="board-card-dot">
                      {"\u00B7"}
                    </span>

                    <span>
                      Ends
                      <strong>
                        {formatBoardDate(
                          board.endsAt,
                        )}
                      </strong>
                    </span>
                  </div>

                  <span
                    className={`board-status board-status-${board.status}`}
                  >
                    {getStatusLabel(
                      board.status,
                    )}
                  </span>
                </div>

                <div className="board-card-row board-card-row-action">
                  <div className="board-card-stats">
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
                        Min Push Up
                      </small>
                      <strong>
                        {formatMoneyMinor(
                          board.minimumBoostMinor,
                          board.currency,
                        )}
                      </strong>
                    </span>
                  </div>

                  <div className="board-card-actions">
                    <button
                      className="board-share-button"
                      type="button"
                      onClick={() =>
                        void shareBoard(board)
                      }
                      aria-label={`Share ${board.name}`}
                      title="Share Board"
                    >
                      <Share2 size={15} />
                    </button>

                    <Link
                      className="board-card-link"
                      to={`/boards/${board.id}`}
                    >
                      View Board
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </main>
  );
}