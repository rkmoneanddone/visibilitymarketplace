import {
  CheckCircle2,
  Clock3,
  RefreshCw,
  TriangleAlert,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  formatMoneyMinor,
} from "../../lib/marketplace/money";

import {
  getPaymentStatus,
} from "../../services/payments/paymentClient";

import type {
  PaymentStatus,
} from "./types";

import "./payment-return.css";

export function PaymentReturnNotice() {
  const [status, setStatus] =
    useState<PaymentStatus | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [dismissed, setDismissed] =
    useState(false);

  const params =
    new URLSearchParams(
      window.location.search,
    );

  const isPaymentReturn =
    params.get("payment") ===
    "return";

  const paymentIntentId =
    params.get("intent") ?? "";

  const clientStatusToken =
    params.get("token") ?? "";

  async function loadStatus() {
    if (
      !paymentIntentId ||
      !clientStatusToken
    ) {
      setError(
        "Payment return information is incomplete.",
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result =
        await getPaymentStatus(
          paymentIntentId,
          clientStatusToken,
        );

      setStatus(
        result.payment,
      );
    } catch (loadError) {
      console.error(
        "Unable to load payment status:",
        loadError,
      );

      setError(
        "Unable to verify payment status right now.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isPaymentReturn) {
      void loadStatus();
    }
  }, [
    isPaymentReturn,
    paymentIntentId,
    clientStatusToken,
  ]);

  if (
    !isPaymentReturn ||
    dismissed
  ) {
    return null;
  }

  const paid =
    status?.status === "paid";

  const failed =
    status?.status === "failed" ||
    status?.status === "provider_error" ||
    status?.status === "cancelled";

  const Icon = paid
    ? CheckCircle2
    : failed
      ? TriangleAlert
      : Clock3;

  return (
    <aside
      className={`payment-return-notice ${
        paid
          ? "success"
          : failed
            ? "failed"
            : "processing"
      }`}
      role="status"
    >
      <Icon size={20} />

      <div className="payment-return-copy">
        <strong>
          {paid
            ? "Payment confirmed"
            : failed
              ? "Payment not completed"
              : "Payment processing"}
        </strong>

        <span>
          {error ||
            status?.message ||
            "Checking payment status..."}
        </span>

        {status && (
          <small>
            {formatMoneyMinor(
              status.amountMinor,
              status.currency,
            )}
            {" · "}
            {status.purpose.replace(
              /_/g,
              " ",
            )}
          </small>
        )}
      </div>

      {!paid && (
        <button
          type="button"
          className="payment-return-refresh"
          disabled={loading}
          onClick={() =>
            void loadStatus()
          }
        >
          <RefreshCw size={15} />
          {loading
            ? "Checking..."
            : "Check again"}
        </button>
      )}

      <button
        type="button"
        className="payment-return-close"
        aria-label="Dismiss payment status"
        onClick={() =>
          setDismissed(true)
        }
      >
        <X size={17} />
      </button>
    </aside>
  );
}
