import {
  doc,
  setDoc,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";

import { db } from "./client";

export async function dbSetDocument(
  collectionName: string,
  documentId: string,
  data: DocumentData,
): Promise<void> {
  const ref = doc(
    db,
    collectionName,
    documentId,
  );

  await setDoc(
    ref,
    data,
  );
}

export async function dbUpdateDocument(
  collectionName: string,
  documentId: string,
  data: DocumentData,
): Promise<void> {
  const ref = doc(
    db,
    collectionName,
    documentId,
  );

  await updateDoc(
    ref,
    data,
  );
}