import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";

import { db } from "./client";

export {
  limit,
  orderBy,
  where,
};

export async function dbQueryCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[],
): Promise<T[]> {
  const ref = collection(
    db,
    collectionName,
  );

  const q = query(
    ref,
    ...constraints,
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as T[];
}