import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { db } from "../../config/firebase";
import type { Listing } from "../../types/marketplace";

const LISTINGS_COLLECTION = "listings";

export async function getPublishedListings(
  maxResults = 50,
): Promise<Listing[]> {
  const listingsRef = collection(db, LISTINGS_COLLECTION);

  const listingsQuery = query(
    listingsRef,
    where("status", "==", "published"),
    orderBy("currentBoostTotalMinor", "desc"),
    limit(maxResults),
  );

  const snapshot = await getDocs(listingsQuery);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Listing[];
}