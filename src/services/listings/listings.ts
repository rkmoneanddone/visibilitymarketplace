import {
  dbRunTransaction,
} from "../../data/database";

import type {
  Listing,
  OwnershipStatus,
} from "../../types/marketplace";

import type {
  ListingFormData,
} from "../../features/listings/listingForm";

import {
  deleteListingFeaturedImage,
  uploadListingFeaturedImage,
} from "./listingImages";

type CreateListingInput = {
  userId: string;
  form: ListingFormData;
};

function createId(
  prefix: string,
): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeSlug(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    )
    .slice(0, 80);
}

export async function createListing({
  userId,
  form,
}: CreateListingInput): Promise<Listing> {
  const listingId =
    createId("listing");

  const auditId =
    `listing_created_${listingId}`;

  const now =
    nowIso();

  const ownershipStatus: OwnershipStatus =
    form.submissionRelationship ===
    "owner"
      ? "claimed"
      : "unclaimed";

  let uploadedImage:
    | {
        path: string;
        url: string;
      }
    | undefined;

  /*
   * Storage cannot participate in a Firestore
   * transaction.
   *
   * Upload first, then rollback the upload if the
   * Firestore transaction fails.
   */
  if (form.featuredImageFile) {
    uploadedImage =
      await uploadListingFeaturedImage(
        listingId,
        userId,
        form.featuredImageFile,
      );
  }

  const listing: Listing = {
    id:
      listingId,

    submittedByUserId:
      userId,

    submissionRelationship:
      form.submissionRelationship,

    ...(form.submissionRelationship ===
    "owner"
      ? {
          claimedOwnerUserId:
            userId,
        }
      : {}),

    ownershipStatus,

    listingTypeId:
      form.listingTypeId,

    ...(form.platformKey
      ? {
          platformKey:
            form.platformKey,
        }
      : {}),

    targetKind:
      form.targetKind,

    categoryId:
      form.categoryId,

    ...(form.subcategoryId
      ? {
          subcategoryId:
            form.subcategoryId,
        }
      : {}),

    title:
      form.title.trim(),

    slug:
      makeSlug(
        form.title,
      ),

    ...(form.handle
      ? {
          handle:
            form.handle,
        }
      : {}),

    ...(form.platformUrl
      ? {
          platformUrl:
            form.platformUrl,
        }
      : {}),

    shortDescription:
      form.shortDescription.trim(),

    externalUrl:
      form.externalUrl.trim(),

    ...(form.websiteUrl
      ? {
          websiteUrl:
            form.websiteUrl,
        }
      : {}),

    ...(form.downloadUrl
      ? {
          downloadUrl:
            form.downloadUrl,
        }
      : {}),

    ...(form.launchDate
      ? {
          launchDate:
            form.launchDate,
        }
      : {}),

    ...(uploadedImage
      ? {
          featuredImageUrl:
            uploadedImage.url,

          featuredImagePath:
            uploadedImage.path,
        }
      : {}),

    status:
      "submitted",

    externalClicks:
      0,

    currentBoostTotalMinor:
      0,

    createdAt:
      now,

    updatedAt:
      now,
  };

  try {
    await dbRunTransaction(
      async (tx) => {
        tx.set(
          "listings",
          listingId,
          listing,
        );

        tx.set(
          "auditEvents",
          auditId,
          {
            id:
              auditId,

            type:
              "listing_created",

            listingId,

            actorUserId:
              userId,

            createdAt:
              now,

            metadata: {
              listingTypeId:
                form.listingTypeId,

              targetKind:
                form.targetKind,

              submissionRelationship:
                form.submissionRelationship,
            },
          },
        );
      },
    );

    return listing;
  } catch (error) {
    /*
     * Compensation:
     * Firestore failed, so remove the orphaned
     * uploaded image.
     */
    if (uploadedImage) {
      try {
        await deleteListingFeaturedImage(
          uploadedImage.path,
        );
      } catch (
        rollbackError
      ) {
        console.error(
          "Failed to rollback listing image:",
          rollbackError,
        );
      }
    }

    throw error;
  }
}