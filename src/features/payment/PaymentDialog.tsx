import {
  CreditCard,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  formatMoneyMinor,
} from "../../lib/marketplace/money";

import {
  createPaymentIntent,
} from "../../services/payments/paymentClient";

import type {
  PaymentRequest,
} from "./types";

import "./payment.css";

type PaymentDialogProps = {
  open: boolean;
  request: PaymentRequest;
  onClose: () => void;
};

export function PaymentDialog({
  open,
  request,
  onClose,
}: PaymentDialogProps) {
  const [submitting, setSubmitting] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  if (!open) {
    return null;
  }

  async function handleContinue() {
    if (submitting) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setMessage(null);

      const result =
        await createPaymentIntent(
          request,
        );

      if (
        result.providerReady &&
        result.checkoutUrl
      ) {
        window.location.assign(
          result.checkoutUrl,
        );
        return;
      }

      setMessage(
        `Payment intent ${result.paymentIntentId} is ready. The payment gateway adapter is not connected yet.`,
      );
    } catch (error) {
      console.error(
        "Unable to prepare payment:",
        error,
      );

      setError(
        "Unable to prepare payment right now.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isBoardEntry =
    request.purpose ===
    "board_entry";

  return (
    <div
      className="payment-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget &&
          !submitting
        ) {
          onClose();
        }
      }}
    >
      <section
        className="payment-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-title"
      >
        <header className="payment-header">
          <div>
            <span className="payment-kicker">
              <CreditCard size={14} />
              SECURE PAYMENT
            </span>

            <h2 id="payment-title">
              {request.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close payment"
          >
            <X size={18} />
          </button>
        </header>

        <div className="payment-amount">
          <span>Amount</span>

          <strong>
            {formatMoneyMinor(
              request.amountMinor,
              request.currency,
            )}
          </strong>
        </div>

        {request.description && (
          <p className="payment-description">
            {request.description}
          </p>
        )}

        <div className="payment-safety">
          <ShieldCheck size={16} />

          <span>
            {isBoardEntry
              ? "Board entry payment activates participation only. It does not improve Board rank."
              : "Paid visibility affects ranking only after verified payment."}
          </span>
        </div>

        <button
          className="payment-primary"
          type="button"
          disabled={submitting}
          onClick={
            handleContinue
          }
        >
          {submitting
            ? "Preparing payment..."
            : "Continue to payment"}
        </button>

        {message && (
          <p
            className="payment-message"
            role="status"
          >
            {message}
          </p>
        )}

        {error && (
          <p
            className="payment-error"
            role="alert"
          >
            {error}
          </p>
        )}

        <p className="payment-disclosure">
          Payments are non-refundable after successful
          processing, except where required by law.
        </p>
      </section>
    </div>
  );
}
