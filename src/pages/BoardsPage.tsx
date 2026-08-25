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
            .includes(query) ||
          board.shortDescription
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
                <div className="board-card-main">
                  <h2>
                    {board.name}
                  </h2>

                  <p>
                    {
                      board.shortDescription
                    }
                  </p>

                  <span>
                    {board.eligibleListingTypeIds.length ===
                      1
                      ? "1 eligible listing type"
                      : `${board.eligibleListingTypeIds.length} eligible listing types`}
                  </span>
                </div>

                <div className="board-card-info">
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
              </article>
            ),
          )}
        </div>
      )}
    </main>
  );
}