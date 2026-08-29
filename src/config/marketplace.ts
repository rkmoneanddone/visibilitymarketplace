export const marketplaceConfig = {
  board: {
    periodLabel: "Weekly board",
  },

  pricing: {
    freeListingEnabled: true,
    freeListingLabel: "100% FREE",
    boardVisibilityAmountMinor: 200,
    boardVisibilityLabel: "$2 Board Activation",
  },

  terminology: {
    pushAction: "Push Up",
    supporterLabel: "supporters",
  },

  homepage: {
    eyebrow: "THE VISIBILITY BOARD",
    headline: "Discover. Support. Move it up.",
    description:
      "Channels, apps, websites and startups compete for visibility. Support the ones you want more people to discover.",
    listingCta: "List yours →",
  },
  promotion: {
    allowThirdPartySubmissions: true,
    allowOwnerSubmissions: true,
    allowListingClaims: false,
  },
} as const;
