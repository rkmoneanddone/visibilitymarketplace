import {
  useEffect,
  useState,
} from "react";

import type {
  Board,
} from "../../types/board";

import {
  formatMoneyMinor,
} from "../../lib/marketplace/money";

import {
  getMyBoards,
} from "../../services/boards/myBoards";

import {
  BoardActivationPaymentButton,
} from "./BoardActivationPaymentButton";

function boardStatusLabel(
  status: Board["status"],
): string {
  switch (status) {
    case "requested":
      return "Awaiting Admin review";
    case "awaiting_activation_payment":
      return "Approved - activation required";
    case "approved":
      return "Approved";
    case "entry_open":
      return "Entry open";
    case "active":
      return "Active";
    case "expired":
      return "Ended";
    case "archived":
      return "Archived";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function MyBoardsSection({
  userId,
}: {
  userId: string;
}) {
  const [boards, setBoards] =
    useState<Board[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result =
          await getMyBoards(
            userId,
          );

        if (active) {
          setBoards(result);
        }
      } catch (error) {
        console.error(
          "Unable to load created Boards:",
          error,
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [userId]);

  return (
    <section className="dashboard-my-boards">
      <div className="dashboard-section-heading">
        <div>
          <p className="eyebrow">
            BOARD CREATOR
          </p>
          <h2>My Boards</h2>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-state">
          Loading your Boards...
        </div>
      ) : boards.length === 0 ? (
        <div className="dashboard-state">
          You have not requested a Board yet.
        </div>
      ) : (
        <div className="dashboard-board-grid">
          {boards.map(
            (board) => (
              <article
                className="dashboard-board-card"
                key={board.id}
              >
                <div>
                  <h3>
                    {board.name}
                  </h3>

                  <span className="dashboard-board-status">
                    {boardStatusLabel(
                      board.status,
                    )}
                  </span>
                </div>

                <div className="dashboard-board-money">
                  <span>
                    Entry{" "}
                    {formatMoneyMinor(
                      board.entryFeeMinor,
                      board.currency,
                    )}
                  </span>

                  <span>
                    Min Push{" "}
                    {formatMoneyMinor(
                      board.minimumBoostMinor,
                      board.currency,
                    )}
                  </span>
                </div>

                {board.rejectionReason && (
                  <p className="dashboard-rejection">
                    Rejection reason:{" "}
                    {board.rejectionReason}
                  </p>
                )}

                <div className="dashboard-board-actions">
                  {board.status ===
                    "awaiting_activation_payment" && (
                    <BoardActivationPaymentButton
                      board={board}
                    />
                  )}

                  {[
                    "approved",
                    "entry_open",
                    "active",
                    "expired",
                    "archived",
                  ].includes(
                    board.status,
                  ) && (
                    <a
                      href={`/boards/${board.id}`}
                    >
                      View Board
                    </a>
                  )}
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </section>
  );
}
