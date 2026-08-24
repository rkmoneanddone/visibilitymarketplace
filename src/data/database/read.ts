import {
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "./client";

export async function dbGetDocument<T>(
  collectionName: string,
  documentId: string,
): Promise<T | null> {
  const ref = doc(
    db,
    collectionName,
    documentId,
  );

  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as T;
}