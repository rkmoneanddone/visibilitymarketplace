export type ListingStatus =
  | "draft"
  | "payment_pending"
  | "submitted"
  | "under_review"
  | "published"
  | "rejected"
  | "suspended"
  | "expired"
  | "archived";

export interface ListingType {
  id: string;
  key: string;
  name: string;
  enabled: boolean;

  freeListingAllowance: number;
  listingFeeMinor: number;
  minimumBoostMinor: number;

  boostingEnabled: boolean;
  sortOrder: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  enabled: boolean;
  sortOrder: number;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  enabled: boolean;
  sortOrder: number;
}

export interface Listing {
  id: string;
  ownerId: string;

  listingTypeId: string;
  categoryId: string;
  subcategoryId?: string;

  title: string;
  slug: string;
  shortDescription: string;
  description?: string;

  externalUrl: string;
  thumbnailUrl?: string;

  country?: string;
  language?: string;

  status: ListingStatus;

  externalClicks: number;
  currentBoostTotalMinor: number;
  currentBoardRank?: number;

  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export type BoostSource = "owner" | "visitor";

export type BoostStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded";

export interface Boost {
  id: string;
  listingId: string;
  boardPeriodId: string;

  supporterUserId?: string;
  source: BoostSource;

  amountMinor: number;
  currency: string;

  paymentId: string;
  status: BoostStatus;

  createdAt: string;
}

export interface BoardPeriod {
  id: string;

  startsAt: string;
  endsAt: string;

  status: "scheduled" | "active" | "closed";

  createdAt: string;
}