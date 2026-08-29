import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  createPortal,
} from "react-dom";

import type {
  Board,
} from "../../types/board";

import type {
  ListingFormData,
} from "../listings/listingForm";

import {
  createListing,
} from "../../services/listings/listings";

import {
  prepareListingSubmission,
} from "../../services/listings/listingSubmissionClient";

import {
  createBoardEntryIntent,
} from "../../services/boards/boardEntryClient";

import {
  AuthDialog,
} from "../auth/AuthDialog";

import {
  useAuth,
} from "../auth/AuthProvider";

import {
  ListingDialog,
} from "../listings/ListingDialog";

import {
  PaymentDialog,
} from "../payment/PaymentDialog";

import type {
  PaymentRequest,
} from "../payment/types";

import type {
  Listing,
} from "../../types/marketplace";

import {
  getMyListings,
} from "../../services/listings/myListings";

type BoardEntryLauncherProps = {
  board: Board;

  children: (
    openEntry: () => void,
  ) => ReactNode;
};

export function BoardEntryLauncher({
  board,
  children,
}: BoardEntryLauncherProps) {
  const {
    firebaseUser,
  } = useAuth();

  const [
    authOpen,
    setAuthOpen,
  ] =
    useState(false);

  const [
    listingOpen,
    setListingOpen,
  ] =
    useState(false);

  const [
    chooseOpen,
    setChooseOpen,
  ] =
    useState(false);

  const [
    myListings,
    setMyListings,
  ] =
    useState<Listing[]>([]);

  const [
    loadingMyListings,
    setLoadingMyListings,
  ] =
    useState(false);

  const [
    pendingOpen,
    setPendingOpen,
  ] =
    useState(false);

  const [
    paymentRequest,
    setPaymentRequest,
  ] =
    useState<PaymentRequest | null>(
      null,
    );

  function openEntry() {
    if (!firebaseUser) {
      setPendingOpen(true);
      setAuthOpen(true);
      return;
    }

    setChooseOpen(true);
  }

  useEffect(() => {
    if (
      !pendingOpen ||
      !firebaseUser
    ) {
      return;
    }

    setPendingOpen(false);
    setAuthOpen(false);
    setChooseOpen(true);
  }, [
    firebaseUser,
    pendingOpen,
  ]);

  useEffect(() => {
    if (
      !chooseOpen ||
      !firebaseUser
    ) {
      return;
    }

    let active = true;

    setLoadingMyListings(true);

    void getMyListings(
      firebaseUser.uid,
      100,
    )
      .then((result) => {
        if (active) {
          setMyListings(result);
        }
      })
      .catch((error) => {
        console.error(
          "Unable to load eligible Listings:",
          error,
        );
      })
      .finally(() => {
        if (active) {
          setLoadingMyListings(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    chooseOpen,
    firebaseUser,
  ]);

  const eligibleListings =
    useMemo(
      () =>
        myListings.filter(
          (listing) =>
            listing.status ===
              "published" &&
            (listing.visibilityScope ??
              "public") ===
              "public" &&
            listing.listingTypeId ===
              board.listingTypeId &&
            (!board.categoryId ||
              listing.categoryId ===
                board.categoryId) &&
            (!board.subcategoryId ||
              listing.subcategoryId ===
                board.subcategoryId),
        ),
      [
        myListings,
        board,
      ],
    );

  async function enterExistingListing(
    listing: Listing,
  ) {
    const result =
      await createBoardEntryIntent({
        boardId:
          board.id,
        listingId:
          listing.id,
      });

    if (
      result.status !==
      "pending_payment"
    ) {
      window.alert(
        "This approved Listing is not ready for Board Entry payment.",
      );
      return;
    }

    setChooseOpen(false);

    setPaymentRequest({
      purpose:
        "board_entry",
      targetKind:
        "board_entry",
      targetId:
        result.boardEntryId,
      amountMinor:
        board.entryFeeMinor,
      currency:
        board.currency,
      title:
        `Add ${listing.title} to ${board.name}`,
      description:
        "This approved Public Listing does not need another Listing fee or another Admin review. The Board Entry fee does not affect ranking.",
    });
  }

  async function handleBoardListing(
    data: ListingFormData,
  ) {
    if (!firebaseUser) {
      throw new Error(
        "Authentication required.",
      );
    }

    const constrainedData:
      ListingFormData = {
        ...data,

        listingTypeId:
          board.listingTypeId,

        categoryId:
          board.categoryId ??
          data.categoryId,

        subcategoryId:
          board.subcategoryId ??
          data.subcategoryId,
      };

    const created =
      await createListing({
        userId:
          firebaseUser.uid,

        form:
          constrainedData,

        visibilityScope:
          "board_only",
      });

    const submission =
      await prepareListingSubmission(
        created.id,
      );

    const result =
      await createBoardEntryIntent({
        boardId:
          board.id,

        listingId:
          created.id,
      });

    setListingOpen(false);

    if (submission.paymentRequired) {
      setPaymentRequest({
        purpose:
          "listing_submission",
        targetKind:
          "listing",
        targetId:
          created.id,
        amountMinor:
          submission.amountMinor,
        currency:
          submission.currency,
        title:
          `Submit ${created.title} for review`,
        description:
          "Pay the Listing fee first. After Admin approval, the separate Board Entry fee becomes available. Neither fee improves ranking.",
      });

      return;
    }

    if (
      result.status ===
      "pending_review"
    ) {
      window.alert(
        "Your listing was submitted for approval. Board entry payment will be available after the listing is approved.",
      );

      return;
    }

    setPaymentRequest({
      purpose:
        "board_entry",

      targetKind:
        "board_entry",

      targetId:
        result.boardEntryId,

      amountMinor:
        board.entryFeeMinor,

      currency:
        board.currency,

      title:
        `Add ${created.title} to ${board.name}`,

      description:
        "Board entry fee activates participation only. It does not improve Board ranking.",
    });
  }

  const portalTarget =
    typeof document !== "undefined"
      ? document.body
      : null;

  return (
    <>
      {children(
        openEntry,
      )}

      {portalTarget &&
        createPortal(
          <>
            <AuthDialog
              open={authOpen}
              onClose={() => {
                setAuthOpen(false);
                setPendingOpen(false);
              }}
            />

            {chooseOpen && (
              <div
                className="listing-dialog-overlay"
                role="presentation"
                onMouseDown={(event) => {
                  if (
                    event.target ===
                    event.currentTarget
                  ) {
                    setChooseOpen(false);
                  }
                }}
              >
                <section
                  className="listing-dialog board-entry-choice-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Enter Board"
                >
                  <header className="listing-dialog-header">
                    <div className="listing-dialog-heading">
                      <div>
                        <p className="eyebrow">
                          ENTER BOARD
                        </p>
                        <h2>
                          {board.name}
                        </h2>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="listing-dialog-close"
                      onClick={() =>
                        setChooseOpen(false)
                      }
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </header>

                  <div className="board-entry-choice-actions">
                    <button
                      type="button"
                      className="payment-primary"
                      onClick={() => {
                        setChooseOpen(false);
                        setListingOpen(true);
                      }}
                    >
                      Create a new Listing
                    </button>

                    <p>
                      New Listings pay the configured Listing fee first, then require Admin approval, then pay this Board's Entry fee.
                    </p>
                  </div>

                  <div className="board-entry-existing-listings">
                    <h3>
                      Use an approved Public Listing
                    </h3>

                    {loadingMyListings ? (
                      <p>Loading your Listings...</p>
                    ) : eligibleListings.length ===
                      0 ? (
                      <p>
                        No eligible approved Public Listings found for this Board.
                      </p>
                    ) : (
                      eligibleListings.map(
                        (listing) => (
                          <button
                            type="button"
                            key={listing.id}
                            className="board-entry-existing-item"
                            onClick={() =>
                              void enterExistingListing(
                                listing,
                              )
                            }
                          >
                            <strong>
                              {listing.title}
                            </strong>
                            {listing.handle && (
                              <span>
                                {listing.handle}
                              </span>
                            )}
                          </button>
                        ),
                      )
                    )}
                  </div>
                </section>
              </div>
            )}

            <ListingDialog
              open={listingOpen}
              mode="create"
              boardContext={{
                boardId:
                  board.id,

                boardName:
                  board.name,

                listingTypeId:
                  board.listingTypeId,

                categoryId:
                  board.categoryId,

                subcategoryId:
                  board.subcategoryId,

                entryFeeMinor:
                  board.entryFeeMinor,

                currency:
                  board.currency,
              }}
              onClose={() =>
                setListingOpen(false)
              }
              onSubmit={
                handleBoardListing
              }
            />

            {paymentRequest && (
              <PaymentDialog
                open={true}
                request={
                  paymentRequest
                }
                onClose={() =>
                  setPaymentRequest(
                    null,
                  )
                }
              />
            )}
          </>,
          portalTarget,
        )}
    </>
  );
}
