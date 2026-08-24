import type {
  User,
} from "firebase/auth";

import {
  dbGetDocument,
  dbSetDocument,
} from "../../data/database";

import type {
  MarketplaceUser,
} from "../../types/user";

const USERS_COLLECTION = "users";

export async function getUserProfile(
  uid: string,
): Promise<MarketplaceUser | null> {
  return dbGetDocument<MarketplaceUser>(
    USERS_COLLECTION,
    uid,
  );
}

export async function ensureUserProfile(
  user: User,
): Promise<MarketplaceUser> {
  const existingProfile =
    await getUserProfile(user.uid);

  if (existingProfile) {
    return existingProfile;
  }

  const now =
    new Date().toISOString();

  const profile: MarketplaceUser = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: "supporter",
    createdAt: now,
    updatedAt: now,
  };

  await dbSetDocument(
    USERS_COLLECTION,
    user.uid,
    profile,
  );

  return profile;
}