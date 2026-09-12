import {
  Search,
  TrendingUp,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  PaymentDialog,
} from "../payment/PaymentDialog";

import type {
  PaymentRequest,
} from "../payment/types";

import {
  formatMoneyMinor,
  inrMinorToViewerInput,
  viewerCurrencySymbol,
  viewerMajorToInrMinor,
} from "../../lib/marketplace/money";

import type {
  PushUpTarget,
} from "./types";

import "./push-up.css";
import "./push-up-custom.css";

type PushUpDialogProps = {
  targets: PushUpTarget[];
  initialTargetId?: string;
  contextLabel: string;
  onClose: () => void;
};

const quickAmountsMinor = [
  10_000,
  50_000,
  100_000,
  250_000,
];

export function PushUpDialog({
  targets,
  initialTargetId,
  contextLabel,
  onClose,
}: PushUpDialogProps) {
  const initialMinimum =
    targets.find(
      (target) =>
        target.id === initialTargetId,
    )?.minimumAmountMinor ?? 10_000;

  const [query, setQuery] =
    useState("");

  const [selectedTargetId, setSelectedTargetId] =
    useState(initialTargetId ?? "");

  const [amountMinor, setAmountMinor] =
    useState(initialMinimum);

  const [amountInput, setAmountInput] =
    useState(inrMinorToViewerInput(initialMinimum));

  const [paymentOpen, setPaymentOpen] =
    useState(false);

  const selectedTarget =
    targets.find(
      (target) => target.id === selectedTargetId,
    ) ?? null;

  useEffect(() => {
    if (!selectedTarget) {
      return;
    }

    if (amountMinor < selectedTarget.minimumAmountMinor) {
      setAmountMinor(selectedTarget.minimumAmountMinor);
      setAmountInput(
        inrMinorToViewerInput(selectedTarget.minimumAmountMinor),
      );
    }
  }, [selectedTarget, amountMinor]);

  const filteredTargets = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      if (!initialTargetId) {
        return [];
      }

      return targets.filter(
        (target) => target.id === initialTargetId,
      );
    }

    return targets.filter(
      (target) =>
        target.title.toLowerCase().includes(normalized) ||
        target.handle?.toLowerCase().includes(normalized),
    );
  }, [targets, query, initialTargetId]);

  const availableAmounts = useMemo(() => {
    const minimum =
      selectedTarget?.minimumAmountMinor ?? 10_000;

    return Array.from(
      new Set([
        minimum,
        ...quickAmountsMinor.filter(
          (value) => value >= minimum,
        ),
      ]),
    ).sort((a, b) => a - b);
  }, [selectedTarget]);

  const minimumAmountMinor =
    selectedTarget?.minimumAmountMinor ?? 10_000;

  const amountValid =
    Boolean(selectedTarget) &&
    amountMinor >= minimumAmountMinor;

  const paymentRequest: PaymentRequest | null =
    selectedTarget && amountValid
      ? {
          purpose: selectedTarget.purpose,
          targetKind: selectedTarget.paymentTargetKind,
          targetId: selectedTarget.paymentTargetId,
          amountMinor,
          currency: selectedTarget.currency,
          title: `Push Up ${selectedTarget.title}`,
          description: `${contextLabel} - ${selectedTarget.title}`,
        }
      : null;

  function selectAmount(value: number) {
    setAmountMinor(value);
    setAmountInput(inrMinorToViewerInput(value));
  }

  function updateCustomAmount(value: string) {
    if (
      value &&
      !/^\d*(?:\.\d{0,2})?$/.test(value)
    ) {
      return;
    }

    setAmountInput(value);
    setAmountMinor(viewerMajorToInrMinor(value) ?? 0);
  }

  return (
    <>
      <div
        className="pushup-overlay"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <section
          className="pushup-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pushup-title"
        >
          <div className="pushup-grab" />

          <header className="pushup-header">
            <div>
              <span className="pushup-kicker">
                <TrendingUp size={14} />
                {contextLabel}
              </span>

              <h2 id="pushup-title">
                Push a listing higher
              </h2>

              <p>
                Choose the listing and amount.
                Ranking changes only after verified payment.
              </p>
            </div>

            <button
              className="pushup-close"
              type="button"
              onClick={onClose}
              aria-label="Close Push Up"
            >
              <X size={18} />
            </button>
          </header>

          {!initialTargetId && targets.length > 1 && (
            <label className="pushup-search">
              <Search size={17} />

              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search listing or @handle"
                autoFocus={!initialTargetId}
              />
            </label>
          )}

          <div className="pushup-listings">
            {filteredTargets.length > 0 ? (
              filteredTargets.map((target) => {
                const selected =
                  target.id === selectedTargetId;

                return (
                  <button
                    type="button"
                    key={target.id}
                    className={`pushup-listing ${selected ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedTargetId(target.id);

                      if (amountMinor < target.minimumAmountMinor) {
                        selectAmount(target.minimumAmountMinor);
                      }
                    }}
                  >
                    <span className="pushup-listing-mark">
                      {target.imageUrl ? (
                        <img src={target.imageUrl} alt="" />
                      ) : (
                        target.title.charAt(0).toUpperCase()
                      )}
                    </span>

                    <span className="pushup-listing-copy">
                      <strong>{target.title}</strong>
                      {target.handle && <small>{target.handle}</small>}
                    </span>

                    <span className="pushup-listing-total">
                      <strong>
                        {formatMoneyMinor(
                          target.currentBoostTotalMinor,
                          target.currency,
                        )}
                      </strong>
                      <small>pushed</small>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="pushup-empty">
                {query.trim()
                  ? "No matching listings."
                  : "Search for the listing you want to Push Up."}
              </div>
            )}
          </div>

          <div className="pushup-amount-panel">
            <div className="pushup-amount-row">
              <div className="pushup-current-amount">
                <span>Push Up</span>
                <strong>
                  {formatMoneyMinor(
                    amountMinor,
                    selectedTarget?.currency ?? "INR",
                  )}
                </strong>
              </div>

              <label className="pushup-custom-amount">
                <span>Custom amount</span>
                <div>
                  <span>{viewerCurrencySymbol()}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amountInput}
                    onChange={(event) =>
                      updateCustomAmount(event.target.value)
                    }
                    aria-label="Custom Push Up amount"
                  />
                </div>
                <small>
                  Minimum {formatMoneyMinor(
                    minimumAmountMinor,
                    selectedTarget?.currency ?? "INR",
                  )}
                </small>
              </label>

              <div className="pushup-amounts">
                {availableAmounts.map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={amountMinor === value ? "active" : ""}
                    onClick={() => selectAmount(value)}
                  >
                    {formatMoneyMinor(
                      value,
                      selectedTarget?.currency ?? "INR",
                    )}
                  </button>
                ))}
              </div>
            </div>

            {!amountValid && selectedTarget && (
              <p className="pushup-amount-error">
                Enter at least {formatMoneyMinor(
                  minimumAmountMinor,
                  selectedTarget.currency,
                )}.
              </p>
            )}

            <button
              className="pushup-pay"
              type="button"
              disabled={!paymentRequest}
              onClick={() => setPaymentOpen(true)}
            >
              Continue to payment - {formatMoneyMinor(
                amountMinor,
                selectedTarget?.currency ?? "INR",
              )}
            </button>

            <p className="pushup-disclosure">
              Paid visibility affects ranking.
              Payments are non-refundable after successful processing,
              except where required by law.
            </p>
          </div>
        </section>
      </div>

      {paymentRequest && (
        <PaymentDialog
          open={paymentOpen}
          request={paymentRequest}
          onClose={() => setPaymentOpen(false)}
        />
      )}
    </>
  );
}
