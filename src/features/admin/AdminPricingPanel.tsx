import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  initialListingTypes,
} from "../../config/listingTypes";

import {
  getMarketplacePricing,
  updateMarketplacePricing,
  type MarketplacePricing,
} from "../../services/pricing/marketplacePricing";

import {
  AdminSystemConfigPanel,
} from "./AdminSystemConfigPanel";

import {
  AdminEmailConfigPanel,
} from "./AdminEmailConfigPanel";

import {
  AdminAuditPanel,
} from "./AdminAuditPanel";

type ControlTab =
  | "pricing"
  | "payments"
  | "email"
  | "ranking"
  | "system"
  | "audit";

function rupeesToMinor(
  value: string,
): number {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return -1;
  }

  return Math.round(amount * 100);
}

function minorToRupees(
  value: number,
): string {
  return (value / 100).toFixed(0);
}

export function AdminPricingPanel() {
  const [activeTab, setActiveTab] =
    useState<ControlTab>("pricing");

  const [pricing, setPricing] =
    useState<MarketplacePricing | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getMarketplacePricing()
      .then((result) => {
        if (active) {
          setPricing(result);
        }
      })
      .catch((error) => {
        console.error(
          "Unable to load pricing:",
          error,
        );

        if (active) {
          setMessage(
            "Unable to load pricing.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const listingTypes =
    useMemo(
      () =>
        initialListingTypes
          .filter((type) => type.enabled)
          .sort(
            (a, b) =>
              a.sortOrder - b.sortOrder,
          ),
      [],
    );

  function updateListingFee(
    typeId: string,
    value: string,
  ) {
    const minor =
      rupeesToMinor(value);

    if (minor < 0) {
      return;
    }

    setPricing(
      (current) =>
        current
          ? {
              ...current,
              listingFeesMinor: {
                ...current.listingFeesMinor,
                [typeId]: minor,
              },
            }
          : current,
    );
  }

  function updatePushMinimum(
    typeId: string,
    value: string,
  ) {
    const minor =
      rupeesToMinor(value);

    if (minor < 0) {
      return;
    }

    setPricing(
      (current) =>
        current
          ? {
              ...current,
              publicPushMinimumMinor: {
                ...current.publicPushMinimumMinor,
                [typeId]: minor,
              },
            }
          : current,
    );
  }

  async function save() {
    if (saving || !pricing) {
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const saved =
        await updateMarketplacePricing(
          pricing,
        );

      setPricing(saved);
      setMessage("Pricing saved.");
    } catch (error) {
      console.error(
        "Unable to save pricing:",
        error,
      );

      setMessage(
        "Unable to save pricing. Listing fees must be ₹0-₹99,900 and Board/Push amounts must be ₹100-₹99,900.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-control-center">
      <div className="admin-control-tabs">
        {([
          ["pricing", "Pricing"],
          ["payments", "Payments"],
          ["email", "Email & Notifications"],
          ["ranking", "Ranking"],
          ["system", "System"],
          ["audit", "Audit"],
        ] as const).map(
          ([key, label]) => (
            <button
              type="button"
              key={key}
              className={
                activeTab === key
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(key)
              }
            >
              {label}
            </button>
          ),
        )}
      </div>

      {activeTab === "email" ? (
        <AdminEmailConfigPanel />
      ) : activeTab === "audit" ? (
        <AdminAuditPanel />
      ) : activeTab !== "pricing" ? (
        <AdminSystemConfigPanel
          section={activeTab}
        />
      ) : !pricing ? (
        <div className="admin-state">
          {message || "Loading pricing..."}
        </div>
      ) : (
        <section className="admin-pricing-panel">
          <div className="admin-pricing-note">
            Base pricing is INR. Listing fees may be ₹0-₹99,900.
            Board and Push minimums must be ₹100-₹99,900.
            Customer-facing UI shows ₹ in India and $ internationally.
          </div>

          <div className="admin-pricing-grid">
            <label>
              Board activation fee (₹)
              <input
                type="number"
                min="100"
                max="99900"
                step="1"
                value={minorToRupees(
                  pricing.boardActivationFeeMinor,
                )}
                onChange={(event) =>
                  setPricing({
                    ...pricing,
                    boardActivationFeeMinor:
                      rupeesToMinor(
                        event.target.value,
                      ),
                  })
                }
              />
            </label>

            <label>
              Board Entry minimum (₹)
              <input
                type="number"
                min="100"
                max="99900"
                step="1"
                value={minorToRupees(
                  pricing.boardEntryMinimumMinor,
                )}
                onChange={(event) =>
                  setPricing({
                    ...pricing,
                    boardEntryMinimumMinor:
                      rupeesToMinor(
                        event.target.value,
                      ),
                  })
                }
              />
            </label>

            <label>
              Board Push minimum (₹)
              <input
                type="number"
                min="100"
                max="99900"
                step="1"
                value={minorToRupees(
                  pricing.boardPushMinimumMinor,
                )}
                onChange={(event) =>
                  setPricing({
                    ...pricing,
                    boardPushMinimumMinor:
                      rupeesToMinor(
                        event.target.value,
                      ),
                  })
                }
              />
            </label>

            <label>
              Maximum payment (₹)
              <input
                type="number"
                min="100"
                max="99900"
                step="1"
                value={minorToRupees(
                  pricing.maximumPaymentMinor,
                )}
                onChange={(event) =>
                  setPricing({
                    ...pricing,
                    maximumPaymentMinor:
                      rupeesToMinor(
                        event.target.value,
                      ),
                  })
                }
              />
            </label>
          </div>

          <div className="admin-pricing-types">
            <div className="admin-pricing-types-head">
              <span>Listing Type</span>
              <span>Listing fee (₹)</span>
              <span>Public Push min (₹)</span>
            </div>

            {listingTypes.map(
              (type) => (
                <div
                  className="admin-pricing-type-row"
                  key={type.id}
                >
                  <strong>{type.name}</strong>

                  <input
                    aria-label={`${type.name} Listing fee in rupees`}
                    type="number"
                    min="0"
                    max="99900"
                    step="1"
                    value={minorToRupees(
                      pricing.listingFeesMinor[
                        type.id
                      ] ?? 0,
                    )}
                    onChange={(event) =>
                      updateListingFee(
                        type.id,
                        event.target.value,
                      )
                    }
                  />

                  <input
                    aria-label={`${type.name} Public Push minimum in rupees`}
                    type="number"
                    min="100"
                    max="99900"
                    step="1"
                    value={minorToRupees(
                      pricing.publicPushMinimumMinor[
                        type.id
                      ] ?? 10_000,
                    )}
                    onChange={(event) =>
                      updatePushMinimum(
                        type.id,
                        event.target.value,
                      )
                    }
                  />
                </div>
              ),
            )}
          </div>

          <button
            type="button"
            className="admin-publish-button"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving
              ? "Saving..."
              : "Save Pricing"}
          </button>

          {message && (
            <p className="admin-pricing-message">
              {message}
            </p>
          )}
        </section>
      )}
    </section>
  );
}
