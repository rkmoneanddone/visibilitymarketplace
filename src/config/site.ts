export const siteConfig = {
  name: "Visibility Marketplace",
  shortName: "VM",
  tagline: "Discover. Support. Rise.",
  description:
    "A visibility marketplace for creators, apps, websites, startups and more.",

  domain: "",

  supportEmail:
    "connectparentsboard@gmail.com",

  builder: {
    name:
      "Rohit Mallick",

    description:
      "Independent product builder working on practical web products and software tools.",
  },

  projects: {
    parentsBoard: {
      name:
        "ParentsBoard",

      url:
        "https://parentsboard.in/",

      description:
        "A school updates and information platform.",
    },

    quickStories: {
      name:
        "QuickStories",

      url:
        "https://www.quickstories.in/",

      description:
        "A web publishing and tools project.",
    },
  },

  currency: {
    code: "USD",
    symbol: "$",
  },

  branding: {
    logoUrl: "",
    faviconUrl: "/favicon.svg",
  },
} as const;
