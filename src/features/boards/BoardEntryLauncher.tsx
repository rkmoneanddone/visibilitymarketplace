import {
  useEffect,
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

    setListingOpen(true);
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
    setListingOpen(true);
  }, [
    firebaseUser,
    pendingOpen,
  ]);

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
      });

    if (
      created.status !==
      "published"
    ) {
      throw new Error(
        "This listing must be published before it can enter the Board.",
      );
    }

    const result =
      await createBoardEntryIntent({
        boardId:
          board.id,

        listingId:
          created.id,
      });

    setListingOpen(false);

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
