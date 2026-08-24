import {
  dbRunTransaction,
} from "../../data/database";

import type {
  Listing,
} from "../../types/marketplace";

type PublishListingInput = {
  listingId: string;
  adminUserId: string;
};

type RejectListingInput = {
  listingId: string;
  adminUserId: string;
  reason: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function createAuditId(
  type: string,
  listingId: string,
): string {
  return `${type}_${listingId}_${crypto.randomUUID()}`;
}

export async function publishListing({
  listingId,
  adminUserId,
}: PublishListingInput): Promise<Listing> {
  const now = nowIso();

  const auditId =
    createAuditId(
      "listing_published",
      listingId,
    );

  let updatedListing:
    | Listing
    | null = null;

  await dbRunTransaction(
    async (tx) => {
      const listing =
        await tx.get<Listing>(
          "listings",
          listingId,
        );

      if (!listing) {
        throw new Error(
          "Listing not found.",
        );
      }

      if (
        listing.status !==
          "submitted" &&
        listing.status !==
          "under_review"
      ) {
        throw new Error(
          "Listing cannot be published from its current status.",
        );
      }

      updatedListing = {
        ...listing,
        status: "published",
        publishedAt: now,
        updatedAt: now,
      };

      tx.update(
        "listings",
        listingId,
        {
          status: "published",
          publishedAt: now,
          updatedAt: now,
        },
      );

      tx.set(
        "auditEvents",
        auditId,
        {
          id: auditId,
          type:
            "listing_published",
          listingId,
          actorUserId:
            adminUserId,
          createdAt: now,
        },
      );
    },
  );

  if (!updatedListing) {
    throw new Error(
      "Unable to publish listing.",
    );
  }

  return updatedListing;
}

export async function rejectListing({
  listingId,
  adminUserId,
  reason,
}: RejectListingInput): Promise<Listing> {
  const trimmedReason =
    reason.trim();

  if (!trimmedReason) {
    throw new Error(
      "Rejection reason is required.",
    );
  }

  const now = nowIso();

  const auditId =
    createAuditId(
      "listing_rejected",
      listingId,
    );

  let updatedListing:
    | Listing
    | null = null;

  await dbRunTransaction(
    async (tx) => {
      const listing =
        await tx.get<Listing>(
          "listings",
          listingId,
        );

      if (!listing) {
        throw new Error(
          "Listing not found.",
        );
      }

      if (
        listing.status !==
          "submitted" &&
        listing.status !==
          "under_review"
      ) {
        throw new Error(
          "Listing cannot be rejected from its current status.",
        );
      }

      updatedListing = {
        ...listing,
        status: "rejected",
        rejectionReason:
          trimmedReason,
        rejectedAt: now,
        updatedAt: now,
      };

      tx.update(
        "listings",
        listingId,
        {
          status: "rejected",
          rejectionReason:
            trimmedReason,
          rejectedAt: now,
          updatedAt: now,
        },
      );

      tx.set(
        "auditEvents",
        auditId,
        {
          id: auditId,
          type:
            "listing_rejected",
          listingId,
          actorUserId:
            adminUserId,
          createdAt: now,
          metadata: {
            reason:
              trimmedReason,
          },
        },
      );
    },
  );

  if (!updatedListing) {
    throw new Error(
      "Unable to reject listing.",
    );
  }

  return updatedListing;
}