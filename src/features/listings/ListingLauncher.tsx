import type {
  ReactNode,
} from "react";

import {
  useEffect,
  useState,
} from "react";

import {
  ListingDialog,
} from "./ListingDialog";

import {
  AuthDialog,
} from "../auth/AuthDialog";

import {
  useAuth,
} from "../auth/AuthProvider";

import type {
  ListingFormData,
} from "./listingForm";

import {
  createListing,
} from "../../services/listings/listings";

import type {
  Listing,
} from "../../types/marketplace";

type ListingLauncherProps = {
  children: (
    openListing: () => void,
  ) => ReactNode;

  onCreated?: (
    listing: Listing,
  ) => void;
};

export function ListingLauncher({
  children,
  onCreated,
}: ListingLauncherProps) {
  const {
    firebaseUser,
  } = useAuth();

  const [listingOpen, setListingOpen] =
    useState(false);

  const [authOpen, setAuthOpen] =
    useState(false);

  const [
    continueAfterAuth,
    setContinueAfterAuth,
  ] = useState(false);

  useEffect(() => {
    if (
      !continueAfterAuth ||
      !firebaseUser
    ) {
      return;
    }

    setContinueAfterAuth(false);
    setAuthOpen(false);
    setListingOpen(true);
  }, [
    continueAfterAuth,
    firebaseUser,
  ]);

  function openListing() {
    if (!firebaseUser) {
      setContinueAfterAuth(true);
      setAuthOpen(true);
      return;
    }

    setListingOpen(true);
  }

  async function handleSubmit(
    data: ListingFormData,
  ) {
    if (!firebaseUser) {
      throw new Error(
        "You must be signed in.",
      );
    }

    const createdListing =
      await createListing({
        userId: firebaseUser.uid,
        form: data,
      });

    onCreated?.(
      createdListing,
    );
  }

  return (
    <>
      {children(openListing)}

      <AuthDialog
        open={authOpen}
        onClose={() => {
          setAuthOpen(false);
          setContinueAfterAuth(false);
        }}
      />

      <ListingDialog
        open={listingOpen}
        mode="create"
        onClose={() =>
          setListingOpen(false)
        }
        onSubmit={handleSubmit}
      />
    </>
  );
}
