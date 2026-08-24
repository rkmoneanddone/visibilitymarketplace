import type { Category, Subcategory } from "../types/marketplace";

export const initialCategories: Category[] = [
  {
    id: "technology",
    name: "Technology",
    slug: "technology",
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "finance",
    name: "Finance",
    slug: "finance",
    enabled: true,
    sortOrder: 2,
  },
  {
    id: "education",
    name: "Education",
    slug: "education",
    enabled: true,
    sortOrder: 3,
  },
  {
    id: "entertainment",
    name: "Entertainment",
    slug: "entertainment",
    enabled: true,
    sortOrder: 4,
  },
  {
    id: "gaming",
    name: "Gaming",
    slug: "gaming",
    enabled: true,
    sortOrder: 5,
  },
  {
    id: "business",
    name: "Business",
    slug: "business",
    enabled: true,
    sortOrder: 6,
  },
  {
    id: "lifestyle",
    name: "Lifestyle",
    slug: "lifestyle",
    enabled: true,
    sortOrder: 7,
  },
  {
    id: "other",
    name: "Other",
    slug: "other",
    enabled: true,
    sortOrder: 99,
  },
];

export const initialSubcategories: Subcategory[] = [
  // Technology
  {
    id: "ai",
    categoryId: "technology",
    name: "AI",
    slug: "ai",
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "software",
    categoryId: "technology",
    name: "Software",
    slug: "software",
    enabled: true,
    sortOrder: 2,
  },
  {
    id: "gadgets",
    categoryId: "technology",
    name: "Gadgets",
    slug: "gadgets",
    enabled: true,
    sortOrder: 3,
  },

  // Finance
  {
    id: "stock-market",
    categoryId: "finance",
    name: "Stock Market",
    slug: "stock-market",
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "personal-finance",
    categoryId: "finance",
    name: "Personal Finance",
    slug: "personal-finance",
    enabled: true,
    sortOrder: 2,
  },
  {
    id: "mutual-funds",
    categoryId: "finance",
    name: "Mutual Funds",
    slug: "mutual-funds",
    enabled: true,
    sortOrder: 3,
  },

  // Education
  {
    id: "school",
    categoryId: "education",
    name: "School",
    slug: "school",
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "competitive-exams",
    categoryId: "education",
    name: "Competitive Exams",
    slug: "competitive-exams",
    enabled: true,
    sortOrder: 2,
  },
  {
    id: "online-learning",
    categoryId: "education",
    name: "Online Learning",
    slug: "online-learning",
    enabled: true,
    sortOrder: 3,
  },

  // Entertainment
  {
    id: "music",
    categoryId: "entertainment",
    name: "Music",
    slug: "music",
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "movies",
    categoryId: "entertainment",
    name: "Movies",
    slug: "movies",
    enabled: true,
    sortOrder: 2,
  },

  // Gaming
  {
    id: "mobile-gaming",
    categoryId: "gaming",
    name: "Mobile Gaming",
    slug: "mobile-gaming",
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "pc-gaming",
    categoryId: "gaming",
    name: "PC Gaming",
    slug: "pc-gaming",
    enabled: true,
    sortOrder: 2,
  },

  // Business
  {
    id: "startups",
    categoryId: "business",
    name: "Startups",
    slug: "startups",
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "marketing",
    categoryId: "business",
    name: "Marketing",
    slug: "marketing",
    enabled: true,
    sortOrder: 2,
  },

  // Lifestyle
  {
    id: "travel",
    categoryId: "lifestyle",
    name: "Travel",
    slug: "travel",
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "food",
    categoryId: "lifestyle",
    name: "Food",
    slug: "food",
    enabled: true,
    sortOrder: 2,
  },
];