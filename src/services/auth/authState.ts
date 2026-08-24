import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";

import { auth } from "../../config/firebase";

export function observeAuthState(
  callback: (user: User | null) => void,
) {
  return onAuthStateChanged(
    auth,
    callback,
  );
}