import type {
  BoardEntry,
} from "../../types/board";

import type {
  Listing,
} from "../../types/marketplace";

import {
  formatMoneyMinor,
} from "../../lib/marketplace/money";

import {
  BoardEntryPaymentButton,
} from "./BoardEntryPaymentButton";

export function MyBoardEntriesSection({
  entries,
  listings,
}: {
  entries: BoardEntry[];
  listings: Listing[];
}) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="dashboard-my-board-entries">
      <div className="dashboard-section-heading">
        <div>
          <p className="eyebrow">
            BOARD PARTICIPATION
          </p>
          <h2>My Board Entries</h2>
        </div>
      </div>

      <div className="dashboard-board-grid">
        {entries.map(
          (entry) => {
            const listing =
              listings.find(
                (item) =>
                  item.id ===
                  entry.listingId,
              );

            return (
              <article
                className="dashboard-board-card"
                key={entry.id}
              >
                <h3>
                  {entry.boardName ||
                    "Board"}
                </h3>

                <p>
                  {entry.listingTitle ||
                    listing?.title ||
                    "Listing"}
                </p>

                <div className="dashboard-board-money">
                  <span>
                    Entry{" "}
                    {formatMoneyMinor(
                      entry.entryFeeMinor,
                      entry.currency,
                    )}
                  </span>

                  <span>
                    Board Push{" "}
                    {formatMoneyMinor(
                      entry.boostTotalMinor,
                      entry.currency,
                    )}
                  </span>
                </div>

                <span className="dashboard-board-status">
                  {entry.status.replace(
                    /_/g,
                    " ",
                  )}
                </span>

                {entry.status ===
                  "pending_payment" &&
                  listing?.status ===
                    "published" && (
                    <div className="dashboard-board-actions">
                      <BoardEntryPaymentButton
                        entry={entry}
                        listing={listing}
                      />
                    </div>
                  )}

                {entry.status ===
                  "entered" && (
                  <div className="dashboard-board-actions">
                    <a
                      href={`/boards/${entry.boardId}`}
                    >
                      View Board
                    </a>
                  </div>
                )}
              </article>
            );
          },
        )}
      </div>
    </section>
  );
}
