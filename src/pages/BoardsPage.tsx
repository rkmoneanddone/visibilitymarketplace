import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  LayoutGrid,
  Search,
} from "lucide-react";

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
        <div className="boards-heading-copy">
          <div>
            <p className="eyebrow">
              <LayoutGrid size={14} />
              BOARDS
            </p>

            <h1>Find a board</h1>
          </div>

          <p>
            Discover focused boards and add your listing to the ones that fit.
          </p>
        </div>

        <div className="boards-search">
          <Search size={16} />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search boards"
          />
        </div>
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
                <div className="board-card-top">
                  <div>
                    <h2>
                      {board.name}
                    </h2>

                    <span className="board-card-type">
                      {getListingTypeName(
                        board.listingTypeId,
                      )}
                    </span>
                  </div>

                  <span className="board-card-status">
                    {board.status}
                  </span>
                </div>

                <div className="board-card-schedule">
                  <div>
                    <span>Starts</span>

                    <strong>
                      {new Date(
                        board.startsAt,
                      ).toLocaleString(
                        undefined,
                        {
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        },
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Entry opens</span>

                    <strong>
                      {new Date(
                        board.entryStartsAt,
                      ).toLocaleString(
                        undefined,
                        {
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        },
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Entry closes</span>

                    <strong>
                      {new Date(
                        board.entryClosesAt,
                      ).toLocaleString(
                        undefined,
                        {
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        },
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Ends</span>

                    <strong>
                      {new Date(
                        board.endsAt,
                      ).toLocaleString(
                        undefined,
                        {
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        },
                      )}
                    </strong>
                  </div>
                </div>

                <div className="board-card-bottom">
                  <div className="board-card-pricing">
                    <span>
                      Entry
                      <strong>
                        {formatMoneyMinor(
                          board.entryFeeMinor,
                          board.currency,
                        )}
                      </strong>
                    </span>

                    <span>
                      Min Push Up
                      <strong>
                        {formatMoneyMinor(
                          board.minimumBoostMinor,
                          board.currency,
                        )}
                      </strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled
                    title="Board detail is the next step"
                  >
                    View Board
                  </button>
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </main>
  );
}