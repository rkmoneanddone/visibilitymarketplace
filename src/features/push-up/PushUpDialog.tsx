import {
  Search,
  TrendingUp,
  X,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  formatMoneyMinor,
} from "../../lib/marketplace/money";

import type {
  Listing,
} from "../../types/marketplace";

import "./push-up.css";

type PushUpDialogProps = {
  listings: Listing[];
  initialListingId?: string;
  contextLabel: string;
  onClose: () => void;
};

const quickAmountsMinor = [
  100,
  500,
  1000,
  2500,
];

export function PushUpDialog({
  listings,
  initialListingId,
  contextLabel,
  onClose,
}: PushUpDialogProps) {
  const [query, setQuery] =
    useState("");

  const [selectedListingId, setSelectedListingId] =
    useState(
      initialListingId ??
        listings[0]?.id ??
        "",
    );

  const [amountMinor, setAmountMinor] =
    useState(500);

  const selectedListing =
    listings.find(
      (listing) =>
        listing.id === selectedListingId,
    ) ?? null;

  const filteredListings =
    useMemo(() => {
      const normalized =
        query.trim().toLowerCase();

      if (!normalized) {
        return listings;
      }

      return listings.filter(
        (listing) =>
          listing.title
            .toLowerCase()
            .includes(normalized) ||
          listing.handle
            ?.toLowerCase()
            .includes(normalized),
      );
    }, [listings, query]);

  function handleContinue() {
    if (!selectedListing) {
      return;
    }

    window.alert(
      `Payment connection is next. ${selectedListing.title} selected for ${formatMoneyMinor(amountMinor)} Push Up.`,
    );
  }

  return (
    <div
      className="pushup-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className="pushup-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pushup-title"
      >
        <div className="pushup-grab" />

        <header className="pushup-header">
          <div>
            <span className="pushup-kicker">
              <TrendingUp size={14} />
              {contextLabel}
            </span>

            <h2 id="pushup-title">
              Push a listing higher
            </h2>

            <p>
              Choose the listing and amount.
              Payment moves its paid ranking
              after verification.
            </p>
          </div>

          <button
            className="pushup-close"
            type="button"
            onClick={onClose}
            aria-label="Close Push Up"
          >
            <X size={18} />
          </button>
        </header>

        <label className="pushup-search">
          <Search size={17} />

          <input
            type="search"
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Search listing or @handle"
            autoFocus={!initialListingId}
          />
        </label>

        <div className="pushup-listings">
          {filteredListings.length > 0 ? (
            filteredListings.map(
              (listing) => {
                const selected =
                  listing.id ===
                  selectedListingId;

                return (
                  <button
                    type="button"
                    key={listing.id}
                    className={`pushup-listing ${
                      selected
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      setSelectedListingId(
                        listing.id,
                      )
                    }
                  >
                    <span className="pushup-listing-mark">
                      {listing.featuredImageUrl ? (
                        <img
                          src={
                            listing.featuredImageUrl
                          }
                          alt=""
                        />
                      ) : (
                        listing.title
                          .charAt(0)
                          .toUpperCase()
                      )}
                    </span>

                    <span className="pushup-listing-copy">
                      <strong>
                        {listing.title}
                      </strong>

                      {listing.handle && (
                        <small>
                          {listing.handle}
                        </small>
                      )}
                    </span>

                    <span className="pushup-listing-total">
                      <strong>
                        {formatMoneyMinor(
                          listing.currentBoostTotalMinor,
                        )}
                      </strong>
                      <small>pushed</small>
                    </span>
                  </button>
                );
              },
            )
          ) : (
            <div className="pushup-empty">
              No matching listings.
            </div>
          )}
        </div>

        <div className="pushup-amount-panel">
          <div className="pushup-amount-row">
            <div className="pushup-current-amount">
              <span>Push Up</span>
              <strong>
                {formatMoneyMinor(amountMinor)}
              </strong>
            </div>

            <div className="pushup-amounts">
              {quickAmountsMinor.map(
                (value) => (
                  <button
                    type="button"
                    key={value}
                    className={
                      amountMinor === value
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setAmountMinor(value)
                    }
                  >
                    {formatMoneyMinor(value)}
                  </button>
                ),
              )}
            </div>
          </div>

          {selectedListing && (
            <div className="pushup-selected-summary">
              <span>Selected</span>
              <strong>
                {selectedListing.title}
              </strong>
              <small>
                {formatMoneyMinor(
                  selectedListing.currentBoostTotalMinor,
                )} pushed
              </small>
            </div>
          )}

          <button
            className="pushup-pay"
            type="button"
            disabled={!selectedListing}
            onClick={handleContinue}
          >
            Continue to payment ·{" "}
            {formatMoneyMinor(
              amountMinor,
            )}
          </button>

          <p className="pushup-disclosure">
            Paid visibility affects ranking.
            Payment must be verified before
            ranking changes.
          </p>
        </div>
      </section>
    </div>
  );
}
