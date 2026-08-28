import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import {
  firebaseApp,
} from "../../config/firebase";

type ClickTargetKind =
  | "listing"
  | "board_entry";

const functions =
  getFunctions(
    firebaseApp,
    "asia-south1",
  );

const recordExternalClickCallable =
  httpsCallable<
    {
      targetKind: ClickTargetKind;
      targetId: string;
    },
    {
      success: boolean;
    }
  >(
    functions,
    "recordExternalClick",
  );

export async function recordExternalClick(
  targetKind: ClickTargetKind,
  targetId: string,
) {
  try {
    await recordExternalClickCallable({
      targetKind,
      targetId,
    });
  } catch (error) {
    console.error(
      "External click tracking failed:",
      error,
    );
  }
}
