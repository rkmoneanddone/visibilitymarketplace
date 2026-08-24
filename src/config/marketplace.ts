export const marketplaceConfig = {
  board: {
    periodLabel: "Weekly board",
  },

  pricing: {
    freeListingEnabled: true,
    freeListingLabel: "100% FREE",
    boardVisibilityAmountMinor: 100,
    boardVisibilityLabel: "$1 Board Visibility",
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
    allowListingClaims: true,
  },
} as const;