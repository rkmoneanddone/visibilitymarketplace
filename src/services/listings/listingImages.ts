import {
  storageDeleteFile,
  storageUploadFile,
} from "../../data/storage";

export interface ListingImageUploadResult {
  path: string;
  url: string;
  bytes: number;
}

function assertOptimizedImage(
  file: File,
): void {
  if (
    file.type !== "image/webp"
  ) {
    throw new Error(
      "Listing image must be optimized to WebP before upload.",
    );
  }

  const maxBytes =
    180 * 1024;

  if (
    file.size > maxBytes
  ) {
    throw new Error(
      "Optimized listing image must be 180 KB or smaller.",
    );
  }
}

export async function uploadListingFeaturedImage(
  listingId: string,
  userId: string,
  file: File,
): Promise<ListingImageUploadResult> {
  assertOptimizedImage(file);

  const path =
    `listings/${listingId}/${userId}/featured.webp`;

  const result =
    await storageUploadFile(
      path,
      file,
    );

  return {
    path:
      result.path,

    url:
      result.url,

    bytes:
      result.bytes,
  };
}

export async function deleteListingFeaturedImage(
  path: string,
): Promise<void> {
  await storageDeleteFile(
    path,
  );
}