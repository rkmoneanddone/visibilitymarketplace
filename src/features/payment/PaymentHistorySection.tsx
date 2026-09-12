import {
  useEffect,
  useState,
} from "react";

import {
  ReceiptText,
} from "lucide-react";

import {
  formatMoneyMinor,
} from "../../lib/marketplace/money";

import {
  getMyPaymentHistory,
  type PaymentHistoryItem,
} from "../../services/payments/paymentHistoryClient";

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

function purposeLabel(
  purpose: string,
) {
  switch (purpose) {
    case "listing_submission":
      return "Listing submission";
    case "listing_push":
      return "Public Push Up";
    case "board_activation":
      return "Board activation";
    case "board_entry":
      return "Board entry";
    case "board_entry_push":
      return "Board Push Up";
    default:
      return purpose || "Payment";
  }
}

export function PaymentHistorySection() {
  const [items, setItems] =
    useState<PaymentHistoryItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getMyPaymentHistory()
      .then((result) => {
        if (active) {
          setItems(result);
        }
      })
      .catch((loadError) => {
        console.error(
          "Unable to load payment history:",
          loadError,
        );

        if (active) {
          setError(
            "Unable to load payment history.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="dashboard-payment-history">
      <div className="dashboard-section-heading">
        <div>
          <p className="eyebrow">
            <ReceiptText size={14} />
            PAYMENTS
          </p>
          <h2>Payment history</h2>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-state">
          Loading payment history...
        </div>
      ) : error ? (
        <div className="dashboard-state">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="dashboard-state">
          No payments yet.
        </div>
      ) : (
        <div className="dashboard-payment-list">
          {items.map((item) => (
            <article
              className="dashboard-payment-row"
              key={item.id}
            >
              <div>
                <strong>
                  {purposeLabel(item.purpose)}
                </strong>
                <span>
                  {item.description || item.targetId}
                </span>
              </div>

              <div>
                <strong>
                  {formatMoneyMinor(
                    item.amountMinor,
                    item.currency,
                  )}
                </strong>
                <span>
                  {formatDate(item.createdAt)}
                </span>
              </div>

              <div>
                <strong>
                  {item.refundStatus === "succeeded"
                    ? "Refunded"
                    : item.status || "Unknown"}
                </strong>
                <span>
                  {item.providerPaymentId
                    ? `Payment ID: ${item.providerPaymentId}`
                    : item.provider || ""}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
