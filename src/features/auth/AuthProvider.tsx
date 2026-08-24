import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";

import { auth } from "../../config/firebase";

import {
  ensureUserProfile,
  getUserProfile,
} from "../../services/auth/userProfile";

import type {
  MarketplaceUser,
} from "../../types/user";

type AuthContextValue = {
  firebaseUser: User | null;
  profile: MarketplaceUser | null;

  initializing: boolean;
  profileLoading: boolean;

  refreshProfile: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [firebaseUser, setFirebaseUser] =
    useState<User | null>(null);

  const [profile, setProfile] =
    useState<MarketplaceUser | null>(null);

  const [initializing, setInitializing] =
    useState(true);

  const [profileLoading, setProfileLoading] =
    useState(false);

  async function loadProfile(
    user: User,
  ) {
    setProfileLoading(true);

    try {
      const result =
        await getUserProfile(user.uid);

      setProfile(result);
    } finally {
      setProfileLoading(false);
    }
  }

  async function refreshProfile() {
    if (!firebaseUser) {
      return;
    }

    /*
     * Controlled refresh:
     * keep the existing profile visible
     * while the fresh profile is fetched.
     */
    await loadProfile(firebaseUser);
  }

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          setFirebaseUser(user);

          if (!user) {
            setProfile(null);
            setInitializing(false);
            return;
          }

          try {
            const userProfile =
              await ensureUserProfile(user);

            setProfile(userProfile);
          } finally {
            setInitializing(false);
          }
        },
      );

    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      initializing,
      profileLoading,
      refreshProfile,
    }),
    [
      firebaseUser,
      profile,
      initializing,
      profileLoading,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error(
      "useAuth must be used inside AuthProvider",
    );
  }

  return value;
}