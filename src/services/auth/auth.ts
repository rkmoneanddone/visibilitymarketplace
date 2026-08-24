import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";

import { auth } from "../../config/firebase";

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(
    auth,
    googleProvider,
  );

  return result.user;
}

export async function registerWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const result =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

  return result.user;
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const result =
    await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );

  return result.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}