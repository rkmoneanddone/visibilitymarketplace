import {
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  PageBreadcrumb,
} from "../components/layout/PageBreadcrumb";

import {
  useAuth,
} from "../features/auth/AuthProvider";

import {
  requestBoard,
} from "../services/boards/boardRequestClient";

import {
  initialListingTypes,
} from "../config/listingTypes";

import {
  initialCategories,
} from "../config/categories";

import {
  BOARD_MIN_ENTRY_FEE_MINOR,
  BOARD_MAX_SINGLE_BOOST_MINOR,
} from "../lib/marketplace/boardRules";

import "./board-request.css";

export function BoardRequestPage() {
  const navigate =
    useNavigate();

  const {
    profile,
    initializing,
  } = useAuth();

  const [name, setName] =
    useState("");

  const [
    shortDescription,
    setShortDescription,
  ] = useState("");

  const [
    eligibleListingTypeIds,
    setEligibleListingTypeIds,
  ] = useState<string[]>([]);

  const [
    categoryId,
    setCategoryId,
  ] = useState("");

  const [
    subcategoryId,
    setSubcategoryId,
  ] = useState("");

  const [
    startsAt,
    setStartsAt,
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

  const selectedCategory =
    initialCategories.find(
      (category) =>
        category.id ===
        categoryId,
    );

  if (initializing) {
    return (
      <main className="board-request-page">
        Loading...
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="board-request-page">
        <PageBreadcrumb
          items={[
            {
              label: "Home",
              to: "/",
            },
            {
              label:
                "Request a board",
            },
          ]}
        />

        <div className="board-request-state">
          Sign in to request a board.
        </div>
      </main>
    );
  }

  function toggleListingType(
    listingTypeId: string,
  ) {
    setEligibleListingTypeIds(
      (current) =>
        current.includes(
          listingTypeId,
        )
          ? current.filter(
              (id) =>
                id !==
                listingTypeId,
            )
          : [
              ...current,
              listingTypeId,
            ],
    );
  }

  async function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const entryFeeMinor =
      Math.round(
        Number(entryFee) *
          100,
      );

    const minimumBoostMinor =
      Math.round(
        Number(minimumBoost) *
          100,
      );

    if (
      entryFeeMinor <
      BOARD_MIN_ENTRY_FEE_MINOR
    ) {
      setError(
        "Entry fee must be at least $1.",
      );
      return;
    }

    if (
      minimumBoostMinor < 1 ||
      minimumBoostMinor >
        BOARD_MAX_SINGLE_BOOST_MINOR
    ) {
      setError(
        "Minimum boost must be between $0.01 and $100.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await requestBoard({
        name,
        shortDescription,
        eligibleListingTypeIds,

        categoryId:
          categoryId ||
          undefined,

        subcategoryId:
          subcategoryId ||
          undefined,

        startsAt,
        entryClosesAt,
        endsAt,

        entryFeeMinor,
        minimumBoostMinor,

        currency: "USD",
      });

      navigate(
        "/dashboard",
      );
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
    <main className="board-request-page">
      <PageBreadcrumb
        items={[
          {
            label: "Home",
            to: "/",
          },
          {
            label:
              "Request a board",
          },
        ]}
      />

      <header className="board-request-header">
        <p className="eyebrow">
          BOARD ON DEMAND
        </p>

        <h1>
          Request a custom board
        </h1>

        <p>
          Create a focused visibility
          board for eligible listings.
          Requests are reviewed before
          they go live.
        </p>
      </header>

      <form
        className="board-request-form"
        onSubmit={
          handleSubmit
        }
      >
        <label>
          <span>
            Board name
          </span>

          <input
            value={name}
            onChange={(event) =>
              setName(
                event.target
                  .value,
              )
            }
            required
            maxLength={80}
          />
        </label>

        <label>
          <span>
            Short description
          </span>

          <textarea
            value={
              shortDescription
            }
            onChange={(event) =>
              setShortDescription(
                event.target
                  .value,
              )
            }
            required
            maxLength={240}
            rows={4}
          />
        </label>

        <fieldset>
          <legend>
            Eligible listing types
          </legend>

          <div className="board-type-options">
            {enabledListingTypes.map(
              (type) => (
                <label
                  key={type.id}
                >
                  <input
                    type="checkbox"
                    checked={
                      eligibleListingTypeIds.includes(
                        type.id,
                      )
                    }
                    onChange={() =>
                      toggleListingType(
                        type.id,
                      )
                    }
                  />

                  <span>
                    {type.name}
                  </span>
                </label>
              ),
            )}
          </div>
        </fieldset>

        <div className="board-request-grid">
          <label>
            <span>
              Category
              {" "}
              <small>
                optional
              </small>
            </span>

            <select
              value={
                categoryId
              }
              onChange={(event) => {
                setCategoryId(
                  event.target
                    .value,
                );

                setSubcategoryId(
                  "",
                );
              }}
            >
              <option value="">
                Any category
              </option>

              {initialCategories
                .filter(
                  (category) =>
                    category
                      .enabled,
                )
                .map(
                  (category) => (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {
                        category.name
                      }
                    </option>
                  ),
                )}
            </select>
          </label>

          <label>
            <span>
              Subcategory
              {" "}
              <small>
                optional
              </small>
            </span>

            <select
              value={
                subcategoryId
              }
              disabled={
                !selectedCategory
              }
              onChange={(event) =>
                setSubcategoryId(
                  event.target
                    .value,
                )
              }
            >
              <option value="">
                Any subcategory
              </option>
            </select>
          </label>
        </div>

        <div className="board-request-grid">
          <label>
            <span>
              Start date
            </span>

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
            <span>
              Entry deadline
            </span>

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
            <span>
              End date
            </span>

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

        <div className="board-request-grid">
          <label>
            <span>
              Entry fee ($)
            </span>

            <input
              type="number"
              min="1"
              step="0.01"
              value={entryFee}
              onChange={(event) =>
                setEntryFee(
                  event.target
                    .value,
                )
              }
              required
            />
          </label>

          <label>
            <span>
              Minimum boost ($)
            </span>

            <input
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              value={
                minimumBoost
              }
              onChange={(event) =>
                setMinimumBoost(
                  event.target
                    .value,
                )
              }
              required
            />
          </label>
        </div>

        {error && (
          <div className="board-request-error">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="board-request-submit"
          disabled={
            submitting ||
            eligibleListingTypeIds
              .length === 0
          }
        >
          {submitting
            ? "Submitting..."
            : "Submit board request"}
        </button>
      </form>
    </main>
  );
}