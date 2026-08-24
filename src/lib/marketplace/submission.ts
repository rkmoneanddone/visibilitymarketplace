import {
  marketplaceConfig,
} from "../../config/marketplace";

export function canSubmitOwnListing() {
  return (
    marketplaceConfig.promotion
      .allowOwnerSubmissions
  );
}

export function canSubmitThirdPartyListing() {
  return (
    marketplaceConfig.promotion
      .allowThirdPartySubmissions
  );
}

export function canClaimListing() {
  return (
    marketplaceConfig.promotion
      .allowListingClaims
  );
}