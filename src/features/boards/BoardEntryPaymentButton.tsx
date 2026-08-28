import {
  useState,
} from "react";

import type {
  BoardEntry,
} from "../../types/board";

import type {
  Listing,
} from "../../types/marketplace";

import {
  createBoardEntryIntent,
} from "../../services/boards/boardEntryClient";

import {
  PaymentDialog,
} from "../payment/PaymentDialog";

import type {
  PaymentRequest,
} from "../payment/types";

type BoardEntryPaymentButtonProps = {
  entry: BoardEntry;
  listing: Listing;
};

export function BoardEntryPaymentButton({
  entry,
  listing,
}: BoardEntryPaymentButtonProps) {
  const [
    preparing,
    setPreparing,
  ] =
    useState(false);

  const [
    paymentRequest,
    setPaymentRequest,
  ] =
    useState<PaymentRequest | null>(
      null,
    );

  async function openPayment() {
    if (preparing) {
      return;
    }

    try {
      setPreparing(true);

      const result =
        await createBoardEntryIntent({
          boardId:
            entry.boardId,

          listingId:
            listing.id,
        });

      if (
        result.status !==
        "pending_payment"
      ) {
        window.alert(
          "This Board entry is still waiting for listing approval.",
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
          entry.entryFeeMinor,

        currency:
          entry.currency,

        title:
          `Complete Board Entry - ${listing.title}`,

        description:
          "Board entry fee activates participation only. It does not improve Board ranking.",
      });
    } catch (error) {
      console.error(
        "Unable to prepare Board entry payment:",
        error,
      );

      window.alert(
        "Unable to prepare Board entry payment right now.",
      );
    } finally {
      setPreparing(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="dashboard-board-payment-button"
        disabled={preparing}
        onClick={() =>
          void openPayment()
        }
      >
        {preparing
          ? "Preparing..."
          : "Complete Board Entry"}
      </button>

      {paymentRequest && (
        <PaymentDialog
          open={true}
          request={paymentRequest}
          onClose={() =>
            setPaymentRequest(null)
          }
        />
      )}
    </>
  );
}
