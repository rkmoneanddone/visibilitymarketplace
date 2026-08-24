import type {
  ListingSubmissionRelationship,
  PromotionTargetKind,
} from "../../types/marketplace";

export interface ListingFormData {
  listingTypeId: string;
  targetKind: PromotionTargetKind;

  submissionRelationship:
  ListingSubmissionRelationship;

  categoryId: string;
  subcategoryId?: string;

  title: string;
  handle?: string;
  platformUrl?: string;

  shortDescription: string;

  externalUrl: string;
  websiteUrl?: string;
  downloadUrl?: string;

  launchDate?: string;

  featuredImageFile?: File | null;
  platformKey?: string;
}

export const emptyListingForm: ListingFormData = {
  listingTypeId: "youtube",
  targetKind: "channel",

  submissionRelationship: "owner",

  categoryId: "",
  subcategoryId: "",

  title: "",
  handle: "",
  platformUrl: "",
  platformKey: "youtube",

  shortDescription: "",

  externalUrl: "",
  websiteUrl: "",
  downloadUrl: "",

  launchDate: "",

  featuredImageFile: null,
};