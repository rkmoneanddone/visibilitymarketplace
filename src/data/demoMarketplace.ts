export type DemoListing = {
  id: string;
  rank: number;
  title: string;
  handle: string;
  owner: string;
  type: string;
  category: string;
  subcategory: string;
  description: string;
  boostTotal: number;
  supporters: number;
  badge?: "TOP" | "RISING" | "NEW";
};

export const demoListings: DemoListing[] = [
  {
    id: "1",
    rank: 1,
    title: "Finance With ABC",
    handle: "@financewithabc",
    owner: "ABC Media",
    type: "YouTube",
    category: "Finance",
    subcategory: "Stock Market",
    description: "Simple investing and market education for everyday investors.",
    boostTotal: 46,
    supporters: 18,
    badge: "TOP",
  },
  {
    id: "2",
    rank: 2,
    title: "BuildSomething",
    handle: "@buildsomething",
    owner: "BuildSomething Labs",
    type: "App",
    category: "Technology",
    subcategory: "AI",
    description: "A lightweight AI productivity app for independent builders.",
    boostTotal: 32,
    supporters: 11,
    badge: "RISING",
  },
  {
    id: "3",
    rank: 3,
    title: "Travel XYZ",
    handle: "@travelxyz",
    owner: "Travel XYZ",
    type: "Instagram",
    category: "Lifestyle",
    subcategory: "Travel",
    description: "Independent travel stories, places and practical discoveries.",
    boostTotal: 21,
    supporters: 7,
  },
  {
    id: "4",
    rank: 4,
    title: "LearnFast",
    handle: "learnfast.example",
    owner: "LearnFast",
    type: "Website",
    category: "Education",
    subcategory: "Online Learning",
    description: "Short practical lessons for students and professionals.",
    boostTotal: 17,
    supporters: 6,
    badge: "NEW",
  },
];

export const newToday = [
  { name: "PromptDesk", type: "App" },
  { name: "Money Hindi", type: "YouTube" },
  { name: "Local Trails", type: "Instagram" },
];

export const demoBoardStats = {
  allListings: 128,
  newToday: 7,
};