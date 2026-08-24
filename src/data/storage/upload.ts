import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import {
  storage,
} from "./client";

export interface StorageUploadResult {
  path: string;
  url: string;
  bytes: number;
  contentType: string;
}

export async function storageUploadFile(
  path: string,
  file: File,
): Promise<StorageUploadResult> {
  const storageRef =
    ref(storage, path);

  const snapshot =
    await uploadBytes(
      storageRef,
      file,
      {
        contentType:
          file.type,
        cacheControl:
          "public,max-age=31536000,immutable",
      },
    );

  const url =
    await getDownloadURL(
      snapshot.ref,
    );

  return {
    path:
      snapshot.ref.fullPath,

    url,

    bytes:
      file.size,

    contentType:
      file.type,
  };
}