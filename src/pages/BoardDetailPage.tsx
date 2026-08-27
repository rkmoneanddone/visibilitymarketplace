import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CalendarDays,
  LayoutGrid,
} from "lucide-react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  getListingTypeName,
} from "../lib/marketplace/listing";

import {
  formatMoneyMinor,
} from "../lib/marketplace/money";

import {
  getBoardById,
} from "../services/boards/boards";

import type {
  Board,
} from "../types/board";

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

function getStatusLabel(status: Board["status"]) {
  return status
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (value) => value.toUpperCase(),
    );
}

function getEntryState(board: Board) {
  const now = Date.now();
  const entryStarts =
    new Date(board.entryStartsAt).getTime();
  const entryCloses =
    new Date(board.entryClosesAt).getTime();
  const ends =
    new Date(board.endsAt).getTime();

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
      detail: `Opens ${formatDate(
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
      "Eligible listing owners can enter now.",
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

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadBoard() {
      if (!boardId) {
        setError("Board not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const result =
          await getBoardById(
            boardId,
          );

        if (!active) {
          return;
        }

        if (!result) {
          setError(
            "This board could not be found.",
          );
          return;
        }

        setBoard(result);
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
  }, [boardId]);

  const entryState =
    useMemo(
      () =>
        board
          ? getEntryState(board)
          : null,
      [board],
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

  if (error || !board || !entryState) {
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

  return (
    <main className="board-detail-page">
      <Link
        className="board-detail-back"
        to="/boards"
      >
        <ArrowLeft size={14} />
        Boards
      </Link>

      <section className="board-detail-card board-summary">
        <div className="board-summary-row board-summary-row-main">
          <div className="board-summary-identity">
            <p className="board-detail-kicker">
              <LayoutGrid size={13} />
              BOARD
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

          <a
            className="board-entry-link"
            href={entryState.canEnter ? "#board-entries" : "#board-schedule"}
          >
            {entryState.canEnter
              ? `Enter Board · ${formatMoneyMinor(
                  board.entryFeeMinor,
                  board.currency,
                )}`
              : entryState.detail}
          </a>
        </div>
      </section>

      <section id="board-schedule" className="board-detail-card board-schedule-card">
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
            <dt>Entry opens</dt>
            <dd>
              {formatDate(
                board.entryStartsAt,
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

          <div>
            <dt>Ends</dt>
            <dd>
              {formatDate(
                board.endsAt,
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section id="board-entries" className="board-detail-card board-entries-card">
        <div className="board-entries-heading">
          <div>
            <span>TOP</span>
            <h2>
              Listings in this Board
            </h2>
          </div>
        </div>

        <div className="board-empty-row">
          <strong>
            No entries yet
          </strong>

          <p>
            During the entry window, any eligible {getListingTypeName(
              board.listingTypeId,
            )} listing owner can enter an existing ViewBid listing. Entered listings will appear here for everyone to discover and support.
          </p>
        </div>
      </section>
    </main>
  );
}
