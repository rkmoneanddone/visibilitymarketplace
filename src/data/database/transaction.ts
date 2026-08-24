import {
  doc,
  runTransaction,
  type DocumentData,
} from "firebase/firestore";

import { db } from "./client";

export interface DbTransactionContext {
  get<T>(
    collectionName: string,
    documentId: string,
  ): Promise<T | null>;

  set(
    collectionName: string,
    documentId: string,
    data: DocumentData,
  ): void;

  update(
    collectionName: string,
    documentId: string,
    data: DocumentData,
  ): void;

  delete(
    collectionName: string,
    documentId: string,
  ): void;
}

export async function dbRunTransaction<T>(
  work: (
    transaction: DbTransactionContext,
  ) => Promise<T>,
): Promise<T> {
  return runTransaction(
    db,
    async (firestoreTransaction) => {
      const transaction: DbTransactionContext = {
        async get<T>(
          collectionName: string,
          documentId: string,
        ): Promise<T | null> {
          const ref = doc(
            db,
            collectionName,
            documentId,
          );

          const snapshot =
            await firestoreTransaction.get(
              ref,
            );

          if (!snapshot.exists()) {
            return null;
          }

          return {
            id: snapshot.id,
            ...snapshot.data(),
          } as T;
        },

        set(
          collectionName,
          documentId,
          data,
        ) {
          const ref = doc(
            db,
            collectionName,
            documentId,
          );

          firestoreTransaction.set(
            ref,
            data,
          );
        },

        update(
          collectionName,
          documentId,
          data,
        ) {
          const ref = doc(
            db,
            collectionName,
            documentId,
          );

          firestoreTransaction.update(
            ref,
            data,
          );
        },

        delete(
          collectionName,
          documentId,
        ) {
          const ref = doc(
            db,
            collectionName,
            documentId,
          );

          firestoreTransaction.delete(
            ref,
          );
        },
      };

      return work(transaction);
    },
  );
}