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

function dollarsToMinor(
  value: string,
): number {
  const amount =
    Number(value);

  if (
    !Number.isFinite(amount)
  ) {
    return -1;
  }

  return Math.round(
    amount * 100,
  );
}

function minorToDollars(
  value: number,
): string {
  return (
    value /
    100
  ).toFixed(2);
}

export function AdminPricingPanel() {
  const [
    pricing,
    setPricing,
  ] =
    useState<MarketplacePricing | null>(
      null,
    );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] =
    useState<string | null>(
      null,
    );

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
          .filter(
            (type) =>
              type.enabled,
          )
          .sort(
            (a, b) =>
              a.sortOrder -
              b.sortOrder,
          ),
      [],
    );

  if (!pricing) {
    return (
      <div className="admin-state">
        {message ||
          "Loading pricing..."}
      </div>
    );
  }

  function updateListingFee(
    typeId: string,
    value: string,
  ) {
    const minor =
      dollarsToMinor(
        value,
      );

    if (minor < 0) {
      return;
    }

    setPricing(
      (current) =>
        current
          ? {
              ...current,
              listingFeesMinor: {
                ...current
                  .listingFeesMinor,
                [typeId]:
                  minor,
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
      dollarsToMinor(
        value,
      );

    if (minor < 0) {
      return;
    }

    setPricing(
      (current) =>
        current
          ? {
              ...current,
              publicPushMinimumMinor:
                {
                  ...current
                    .publicPushMinimumMinor,
                  [typeId]:
                    minor,
                },
            }
          : current,
    );
  }

  async function save() {
    if (
      saving ||
      !pricing
    ) {
      return;
    }

    const pricingToSave =
      pricing;

    try {
      setSaving(true);
      setMessage(null);

      const saved =
        await updateMarketplacePricing(
          pricingToSave,
        );

      setPricing(saved);
      setMessage(
        "Pricing saved.",
      );
    } catch (error) {
      console.error(
        "Unable to save pricing:",
        error,
      );

      setMessage(
        "Unable to save pricing. Check that every Listing fee is $0-$999 and every Board/Push amount is $1-$999.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-pricing-panel">
      <div className="admin-pricing-note">
        Listing fees may be $0-$999.
        Board and Push minimums must
        be $1-$999. Prices are
        enforced by the server.
      </div>

      <div className="admin-pricing-grid">
        <label>
          Board activation fee ($)
          <input
            type="number"
            min="1"
            max="999"
            step="0.01"
            value={minorToDollars(
              pricing
                .boardActivationFeeMinor,
            )}
            onChange={(event) =>
              setPricing({
                ...pricing,
                boardActivationFeeMinor:
                  dollarsToMinor(
                    event.target.value,
                  ),
              })
            }
          />
        </label>

        <label>
          Board Entry minimum ($)
          <input
            type="number"
            min="1"
            max="999"
            step="0.01"
            value={minorToDollars(
              pricing
                .boardEntryMinimumMinor,
            )}
            onChange={(event) =>
              setPricing({
                ...pricing,
                boardEntryMinimumMinor:
                  dollarsToMinor(
                    event.target.value,
                  ),
              })
            }
          />
        </label>

        <label>
          Board Push minimum ($)
          <input
            type="number"
            min="1"
            max="999"
            step="0.01"
            value={minorToDollars(
              pricing
                .boardPushMinimumMinor,
            )}
            onChange={(event) =>
              setPricing({
                ...pricing,
                boardPushMinimumMinor:
                  dollarsToMinor(
                    event.target.value,
                  ),
              })
            }
          />
        </label>

        <label>
          Maximum payment ($)
          <input
            type="number"
            min="1"
            max="999"
            step="0.01"
            value={minorToDollars(
              pricing
                .maximumPaymentMinor,
            )}
            onChange={(event) =>
              setPricing({
                ...pricing,
                maximumPaymentMinor:
                  dollarsToMinor(
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
          <span>Listing fee</span>
          <span>Public Push min</span>
        </div>

        {listingTypes.map(
          (type) => (
            <div
              className="admin-pricing-type-row"
              key={type.id}
            >
              <strong>
                {type.name}
              </strong>

              <input
                aria-label={
                  `${type.name} Listing fee`
                }
                type="number"
                min="0"
                max="999"
                step="0.01"
                value={minorToDollars(
                  pricing
                    .listingFeesMinor[
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
                aria-label={
                  `${type.name} Public Push minimum`
                }
                type="number"
                min="1"
                max="999"
                step="0.01"
                value={minorToDollars(
                  pricing
                    .publicPushMinimumMinor[
                      type.id
                    ] ?? 100,
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
        onClick={() =>
          void save()
        }
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
  );
}
