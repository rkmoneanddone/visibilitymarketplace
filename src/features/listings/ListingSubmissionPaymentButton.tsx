import {
  useState,
} from "react";

import type {
  Listing,
} from "../../types/marketplace";

import {
  prepareListingSubmission,
} from "../../services/listings/listingSubmissionClient";

import {
  PaymentDialog,
} from "../payment/PaymentDialog";

import type {
  PaymentRequest,
} from "../payment/types";

export function ListingSubmissionPaymentButton({
  listing,
}: {
  listing: Listing;
}) {
  const [
    preparing,
    setPreparing,
  ] = useState(false);

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
        await prepareListingSubmission(
          listing.id,
        );

      if (!result.paymentRequired) {
        window.location.reload();
        return;
      }

      setPaymentRequest({
        purpose:
          "listing_submission",
        targetKind:
          "listing",
        targetId:
          listing.id,
        amountMinor:
          result.amountMinor,
        currency:
          result.currency,
        title:
          `Submit ${listing.title} for review`,
        description:
          "The Listing fee submits this Listing for Admin review. Approval is required and this fee does not affect ranking.",
      });
    } catch (error) {
      console.error(
        "Unable to prepare Listing submission payment:",
        error,
      );

      window.alert(
        "Unable to prepare Listing submission payment right now.",
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
          : "Pay Listing Fee"}
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
