import {
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  LayoutGrid,
  Sparkles,
} from "lucide-react";

import {
  initialListingTypes,
} from "../../config/listingTypes";

import {
  inrMinorToViewerInput,
  isIndianViewer,
  viewerCurrencySymbol,
  viewerMajorToInrMinor,
} from "../../lib/marketplace/money";

import {
  requestBoard,
} from "../../services/boards/boardRequestClient";

import "../listings/listing-dialog.css";
import "./request-board-dialog.css";

type RequestBoardDialogProps = {
  open: boolean;
  onClose: () => void;
  onRequested?: () => void;
};

const DEFAULT_BOARD_AMOUNT_MINOR = 10_000;

export function RequestBoardDialog({
  open,
  onClose,
  onRequested,
}: RequestBoardDialogProps) {
  const [name, setName] = useState("");
  const [listingTypeId, setListingTypeId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [entryStartsAt, setEntryStartsAt] = useState("");
  const [entryClosesAt, setEntryClosesAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [entryFee, setEntryFee] = useState(
    inrMinorToViewerInput(DEFAULT_BOARD_AMOUNT_MINOR),
  );
  const [minimumBoost, setMinimumBoost] = useState(
    inrMinorToViewerInput(DEFAULT_BOARD_AMOUNT_MINOR),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabledListingTypes = useMemo(
    () =>
      initialListingTypes
        .filter((type) => type.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [],
  );

  if (!open) {
    return null;
  }

  const currencySymbol = viewerCurrencySymbol();
  const defaultActivationDisplay = isIndianViewer()
    ? "₹200"
    : "$2.00";

  function resetForm() {
    setName("");
    setListingTypeId("");
    setStartsAt("");
    setEntryStartsAt("");
    setEntryClosesAt("");
    setEndsAt("");
    setEntryFee(inrMinorToViewerInput(DEFAULT_BOARD_AMOUNT_MINOR));
    setMinimumBoost(inrMinorToViewerInput(DEFAULT_BOARD_AMOUNT_MINOR));
    setError(null);
  }

  function closeDialog() {
    if (submitting) {
      return;
    }

    resetForm();
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    if (!name.trim()) {
      setError("Please enter a board name.");
      return;
    }

    if (!listingTypeId) {
      setError("Please select a listing type.");
      return;
    }

    if (!startsAt || !entryStartsAt || !entryClosesAt || !endsAt) {
      setError("Please complete all board dates.");
      return;
    }

    const boardStart = new Date(startsAt);
    const entryStart = new Date(entryStartsAt);
    const entryClose = new Date(entryClosesAt);
    const boardEnd = new Date(endsAt);

    if (
      [boardStart, entryStart, entryClose, boardEnd].some(
        (value) => Number.isNaN(value.getTime()),
      )
    ) {
      setError("Please enter valid dates.");
      return;
    }

    if (entryStart <= boardStart) {
      setError("Entry start must be after the board start.");
      return;
    }

    if (entryClose <= entryStart) {
      setError("Entry close must be after entry start.");
      return;
    }

    if (boardEnd <= entryClose) {
      setError("Board end must be after entry close.");
      return;
    }

    const entryFeeMinor = viewerMajorToInrMinor(entryFee);
    const minimumBoostMinor = viewerMajorToInrMinor(minimumBoost);

    if (
      entryFeeMinor === null ||
      entryFeeMinor < 10_000 ||
      entryFeeMinor > 9_990_000 ||
      entryFeeMinor % 100 !== 0
    ) {
      setError(
        isIndianViewer()
          ? "Entry fee must be between ₹100 and ₹99,900."
          : "Entry fee must be between $1 and $999.",
      );
      return;
    }

    if (
      minimumBoostMinor === null ||
      minimumBoostMinor < 10_000 ||
      minimumBoostMinor > 9_990_000 ||
      minimumBoostMinor % 100 !== 0
    ) {
      setError(
        isIndianViewer()
          ? "Minimum Push Up must be between ₹100 and ₹99,900."
          : "Minimum Push Up must be between $1 and $999.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await requestBoard({
        name: name.trim(),
        listingTypeId,
        startsAt: boardStart.toISOString(),
        entryStartsAt: entryStart.toISOString(),
        entryClosesAt: entryClose.toISOString(),
        endsAt: boardEnd.toISOString(),
        entryFeeMinor,
        minimumBoostMinor,
        currency: "INR",
      });

      resetForm();
      onRequested?.();
      onClose();
    } catch (requestError) {
      console.error("Board request failed:", requestError);
      setError("Unable to submit board request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="listing-dialog-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          closeDialog();
        }
      }}
    >
      <section
        className="listing-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Request a board"
      >
        <header className="listing-dialog-header">
          <div className="listing-dialog-heading">
            <span className="listing-heading-icon">
              <LayoutGrid size={17} />
            </span>
            <div>
              <p className="eyebrow">BOARD ON DEMAND</p>
              <h2>Request a board</h2>
            </div>
          </div>

          <button
            type="button"
            className="listing-dialog-close"
            disabled={submitting}
            onClick={closeDialog}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="listing-status-strip">
          <span className="listing-status-badge free">REQUEST</span>
          <span className="listing-status-copy">
            <Sparkles size={13} />
            Request is free. After Admin approval, the creator pays the configured Board activation fee (default {defaultActivationDisplay}).
          </span>
        </div>

        <form className="listing-form" onSubmit={handleSubmit}>
          <label>
            Board name *
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="Example: Top Finance YouTube Channels"
              required
            />
          </label>

          <label>
            Listing type *
            <select
              value={listingTypeId}
              onChange={(event) => setListingTypeId(event.target.value)}
              required
            >
              <option value="">Select listing type</option>
              {enabledListingTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>

          <div className="listing-form-row">
            <label>
              Entry fee ({currencySymbol}) *
              <input
                type="text"
                inputMode="decimal"
                value={entryFee}
                onChange={(event) => setEntryFee(event.target.value)}
                required
              />
            </label>

            <label>
              Minimum Push Up ({currencySymbol}) *
              <input
                type="text"
                inputMode="decimal"
                value={minimumBoost}
                onChange={(event) => setMinimumBoost(event.target.value)}
                required
              />
            </label>
          </div>

          <div className="listing-form-row">
            <label>
              Starts *
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                required
              />
            </label>

            <label>
              Entry starts *
              <input
                type="datetime-local"
                value={entryStartsAt}
                onChange={(event) => setEntryStartsAt(event.target.value)}
                required
              />
            </label>
          </div>

          <div className="listing-form-row">
            <label>
              Entry closes *
              <input
                type="datetime-local"
                value={entryClosesAt}
                onChange={(event) => setEntryClosesAt(event.target.value)}
                required
              />
            </label>

            <label>
              Ends *
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                required
              />
            </label>
          </div>

          {error && <p className="listing-form-error">{error}</p>}

          <div className="listing-form-actions">
            <span className="listing-submit-note">
              Reviewed before going live.
            </span>
            <div>
              <button
                type="button"
                className="listing-cancel-button"
                disabled={submitting}
                onClick={closeDialog}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="listing-form-primary"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Request Board"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
