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
  requestBoard,
} from "../../services/boards/boardRequestClient";

import "../listings/listing-dialog.css";
import "./request-board-dialog.css";

type RequestBoardDialogProps = {
  open: boolean;
  onClose: () => void;
  onRequested?: () => void;
};

export function RequestBoardDialog({
  open,
  onClose,
  onRequested,
}: RequestBoardDialogProps) {
  const [name, setName] =
    useState("");

  const [
    listingTypeId,
    setListingTypeId,
  ] = useState("");

  const [
    startsAt,
    setStartsAt,
  ] = useState("");

  const [
    entryStartsAt,
    setEntryStartsAt,
  ] = useState("");

  const [
    entryClosesAt,
    setEntryClosesAt,
  ] = useState("");

  const [
    endsAt,
    setEndsAt,
  ] = useState("");

  const [
    entryFee,
    setEntryFee,
  ] = useState("1");

  const [
    minimumBoost,
    setMinimumBoost,
  ] = useState("1");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const enabledListingTypes =
    useMemo(
      () =>
        initialListingTypes
          .filter(
            (type) =>
              type.enabled,
          )
          .sort(
            (a, b) =>
              a.sortOrder -
              b.sortOrder,
          ),
      [],
    );

  if (!open) {
    return null;
  }

  function resetForm() {
    setName("");
    setListingTypeId("");

    setStartsAt("");
    setEntryStartsAt("");
    setEntryClosesAt("");
    setEndsAt("");

    setEntryFee("1");
    setMinimumBoost("1");

    setError(null);
  }

  function closeDialog() {
    if (submitting) {
      return;
    }

    resetForm();
    onClose();
  }


  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    if (!name.trim()) {
      setError(
        "Please enter a board name.",
      );
      return;
    }

    if (!listingTypeId) {
      setError(
        "Please select a listing type.",
      );
      return;
    }

    if (
      !startsAt ||
      !entryStartsAt ||
      !entryClosesAt ||
      !endsAt
    ) {
      setError(
        "Please complete all board dates.",
      );
      return;
    }

    const boardStart =
      new Date(startsAt);

    const entryStart =
      new Date(entryStartsAt);

    const entryClose =
      new Date(entryClosesAt);

    const boardEnd =
      new Date(endsAt);

    if (
      Number.isNaN(
        boardStart.getTime(),
      ) ||
      Number.isNaN(
        entryStart.getTime(),
      ) ||
      Number.isNaN(
        entryClose.getTime(),
      ) ||
      Number.isNaN(
        boardEnd.getTime(),
      )
    ) {
      setError(
        "Please enter valid dates.",
      );
      return;
    }

    if (
      entryStart <= boardStart
    ) {
      setError(
        "Entry start must be after the board start.",
      );
      return;
    }

    if (
      entryClose <= entryStart
    ) {
      setError(
        "Entry close must be after entry start.",
      );
      return;
    }

    if (
      boardEnd <= entryClose
    ) {
      setError(
        "Board end must be after entry close.",
      );
      return;
    }

    const entryFeeDollars =
      Number(entryFee);

    const minimumBoostDollars =
      Number(minimumBoost);

    if (
      !Number.isSafeInteger(
        entryFeeDollars,
      ) ||
      entryFeeDollars < 1 ||
      entryFeeDollars > 999
    ) {
      setError(
        "Entry fee must be a whole dollar amount between $1 and $999.",
      );
      return;
    }

    if (
      !Number.isSafeInteger(
        minimumBoostDollars,
      ) ||
      minimumBoostDollars < 1 ||
      minimumBoostDollars > 999
    ) {
      setError(
        "Minimum Push Up must be a whole dollar amount between $1 and $999.",
      );
      return;
    }

    const entryFeeMinor =
      entryFeeDollars * 100;

    const minimumBoostMinor =
      minimumBoostDollars *
      100;

    try {
      setSubmitting(true);
      setError(null);

      await requestBoard({
        name:
          name.trim(),

        listingTypeId,

        startsAt:
          boardStart.toISOString(),

        entryStartsAt:
          entryStart.toISOString(),

        entryClosesAt:
          entryClose.toISOString(),

        endsAt:
          boardEnd.toISOString(),

        entryFeeMinor,
        minimumBoostMinor,

        currency: "USD",
      });

      resetForm();

      onRequested?.();
      onClose();
    } catch (error) {
      console.error(
        "Board request failed:",
        error,
      );

      setError(
        "Unable to submit board request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="listing-dialog-overlay"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget &&
          !submitting
        ) {
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
              <LayoutGrid
                size={17}
              />
            </span>

            <div>
              <p className="eyebrow">
                BOARD ON DEMAND
              </p>

              <h2>
                Request a board
              </h2>
            </div>
          </div>

          <button
            type="button"
            className="listing-dialog-close"
            disabled={submitting}
            onClick={
              closeDialog
            }
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="listing-status-strip">
          <span className="listing-status-badge free">
            REQUEST
          </span>

          <span className="listing-status-copy">
            <Sparkles
              size={13}
            />
            Request is free. After Admin approval, the creator pays the configured Board activation fee (default $2).
          </span>
        </div>

        <form
          className="listing-form"
          onSubmit={
            handleSubmit
          }
        >
          <label>
            Board name *

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target
                    .value,
                )
              }
              maxLength={80}
              placeholder="Example: Top Finance YouTube Channels"
              required
            />
          </label>

          <label>
            Listing type *

            <select
              value={
                listingTypeId
              }
              onChange={(event) =>
                setListingTypeId(
                  event.target
                    .value,
                )
              }
              required
            >
              <option value="">
                Select listing type
              </option>

              {enabledListingTypes.map(
                (type) => (
                  <option
                    key={type.id}
                    value={type.id}
                  >
                    {type.name}
                  </option>
                ),
              )}
            </select>
          </label>

          <div className="listing-form-row">
            <label>
              Entry fee ($) *

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={entryFee}
                onChange={(event) => {
                  const value =
                    event.target.value;

                  if (value === "") {
                    setEntryFee("");
                    return;
                  }

                  if (!/^\d+$/.test(value)) {
                    return;
                  }

                  const amount =
                    Number(value);

                  if (
                    !Number.isSafeInteger(amount) ||
                    amount < 1 ||
                    amount > 999
                  ) {
                    return;
                  }

                  setEntryFee(value);
                }}
                maxLength={3}
                required
              />
            </label>

            <label>
              Minimum Push Up ($) *

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={minimumBoost}
                onChange={(event) => {
                  const value =
                    event.target.value;

                  if (value === "") {
                    setMinimumBoost("");
                    return;
                  }

                  if (!/^\d+$/.test(value)) {
                    return;
                  }

                  const amount =
                    Number(value);

                  if (
                    !Number.isSafeInteger(amount) ||
                    amount < 1 ||
                    amount > 999
                  ) {
                    return;
                  }

                  setMinimumBoost(value);
                }}
                maxLength={3}
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
                onChange={(event) =>
                  setStartsAt(
                    event.target
                      .value,
                  )
                }
                required
              />
            </label>

            <label>
              Entry starts *

              <input
                type="datetime-local"
                value={
                  entryStartsAt
                }
                onChange={(event) =>
                  setEntryStartsAt(
                    event.target
                      .value,
                  )
                }
                required
              />
            </label>
          </div>

          <div className="listing-form-row">
            <label>
              Entry closes *

              <input
                type="datetime-local"
                value={
                  entryClosesAt
                }
                onChange={(event) =>
                  setEntryClosesAt(
                    event.target
                      .value,
                  )
                }
                required
              />
            </label>

            <label>
              Ends *

              <input
                type="datetime-local"
                value={endsAt}
                onChange={(event) =>
                  setEndsAt(
                    event.target
                      .value,
                  )
                }
                required
              />
            </label>
          </div>

          {error && (
            <p className="listing-form-error">
              {error}
            </p>
          )}

          <div className="listing-form-actions">
            <span className="listing-submit-note">
              Reviewed before going live.
            </span>

            <div>
              <button
                type="button"
                className="listing-cancel-button"
                disabled={
                  submitting
                }
                onClick={
                  closeDialog
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="listing-form-primary"
                disabled={
                  submitting
                }
              >
                {submitting
                  ? "Submitting..."
                  : "Request Board"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
