import {
  useState,
} from "react";

import type {
  Board,
} from "../../types/board";

import {
  PaymentDialog,
} from "../payment/PaymentDialog";

import type {
  PaymentRequest,
} from "../payment/types";

export function BoardActivationPaymentButton({
  board,
}: {
  board: Board;
}) {
  const [
    paymentRequest,
    setPaymentRequest,
  ] =
    useState<PaymentRequest | null>(
      null,
    );

  const amountMinor =
    board.activationFeeMinor ??
    100;

  return (
    <>
      <button
        type="button"
        className="dashboard-board-payment-button"
        onClick={() =>
          setPaymentRequest({
            purpose:
              "board_activation",
            targetKind:
              "board",
            targetId:
              board.id,
            amountMinor,
            currency:
              board.currency,
            title:
              `Activate ${board.name}`,
            description:
              "This Board has passed Admin review. Activation payment makes it eligible to enter its scheduled lifecycle. The fee does not affect ranking.",
          })
        }
      >
        Activate Board
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
