import type {
  PromotionTargetKind,
} from "../../types/marketplace";

export interface ListingFormData {
  listingTypeId: string;
  targetKind: PromotionTargetKind;
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
