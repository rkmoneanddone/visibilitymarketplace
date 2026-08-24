import {
  deleteObject,
  ref,
} from "firebase/storage";

import {
  storage,
} from "./client";

export async function storageDeleteFile(
  path: string,
): Promise<void> {
  const storageRef =
    ref(storage, path);

  await deleteObject(
    storageRef,
  );
}