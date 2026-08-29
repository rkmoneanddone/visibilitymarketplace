import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import {
  firebaseApp,
} from "../../config/firebase";

export type MarketplacePricing = {
  listingFeesMinor:
    Record<string, number>;
  publicPushMinimumMinor:
    Record<string, number>;
  boardActivationFeeMinor:
    number;
  boardEntryMinimumMinor:
    number;
  boardPushMinimumMinor:
    number;
  maximumPaymentMinor:
    number;
  currency:
    "USD";
};

type PricingResult = {
  success: boolean;
  pricing:
    MarketplacePricing;
};

const functions =
  getFunctions(
    firebaseApp,
    "asia-south1",
  );

const getPricingCallable =
  httpsCallable<
    Record<string, never>,
    PricingResult
  >(
    functions,
    "getMarketplacePricing",
  );

const updatePricingCallable =
  httpsCallable<
    {
      pricing:
        MarketplacePricing;
    },
    PricingResult
  >(
    functions,
    "updateMarketplacePricing",
  );

export async function getMarketplacePricing():
  Promise<MarketplacePricing> {
  const result =
    await getPricingCallable({});

  return result.data.pricing;
}

export async function updateMarketplacePricing(
  pricing: MarketplacePricing,
): Promise<MarketplacePricing> {
  const result =
    await updatePricingCallable({
      pricing,
    });

  return result.data.pricing;
}
