export type BoardStatus =
    | "requested"
    | "approved"
    | "entry_open"
    | "active"
    | "expired"
    | "archived"
    | "rejected"
    | "cancelled";



export interface Board {
    id: string;

    name: string;
    slug: string;

    searchTokens?: string[];

    createdByUserId: string;
    createdByDisplayName: string;
    createdByEmail: string;
    approvedByAdminUserId?: string;

    status: BoardStatus;

    listingTypeId: string;

  categoryId?: string;
  subcategoryId?: string;

    startsAt: string;
    entryStartsAt: string;
    entryClosesAt: string;
    endsAt: string;

    entryFeeMinor: number;
    minimumBoostMinor: number;

    currency: string;

    imageUrl?: string;
    imagePath?: string;

    createdAt: string;
    updatedAt: string;

    approvedAt?: string;
    rejectedAt?: string;
    archivedAt?: string;

    rejectionReason?: string;
}

export type BoardEntryStatus =
    | "pending_review"
    | "pending_payment"
    | "entered"
    | "rejected"
    | "withdrawn";

export interface BoardEntry {
    id: string;
    boardId: string;
    listingId: string;

    submittedByUserId: string;

    status: BoardEntryStatus;

    entryFeeMinor: number;
    currency: string;
    entryPaymentId?: string;

    boostTotalMinor: number;
    supporterCount: number;

    externalClicks?: number;

    searchTokens?: string[];

    listingTitle?: string;
    listingHandle?: string;
    listingExternalUrl?: string;
    listingFeaturedImageUrl?: string;
    listingTypeId?: string;

    joinedAt: string;
    updatedAt: string;

    approvedAt?: string;
}
