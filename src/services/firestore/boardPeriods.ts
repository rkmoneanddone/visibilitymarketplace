import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { db } from "../../config/firebase";
import type { BoardPeriod } from "../../types/marketplace";

const BOARD_PERIODS_COLLECTION = "boardPeriods";

export async function getActiveBoardPeriod(): Promise<BoardPeriod | null> {
  const boardPeriodsRef = collection(db, BOARD_PERIODS_COLLECTION);

  const boardQuery = query(
    boardPeriodsRef,
    where("status", "==", "active"),
    orderBy("startsAt", "desc"),
    limit(1),
  );

  const snapshot = await getDocs(boardQuery);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];

  return {
    id: doc.id,
    ...doc.data(),
  } as BoardPeriod;
}