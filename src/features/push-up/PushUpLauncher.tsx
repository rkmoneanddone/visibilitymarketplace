import {
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  Listing,
} from "../../types/marketplace";

import {
  PushUpDialog,
} from "./PushUpDialog";

import {
  listingToPushUpTarget,
  type PushUpTarget,
} from "./types";

type PushUpLauncherProps = {
  listings?: Listing[];

  targets?: PushUpTarget[];

  initialListingId?: string;

  initialTargetId?: string;

  contextLabel?: string;

  children: (
    openPushUp: () => void,
  ) => ReactNode;
};

export function PushUpLauncher({
  listings = [],
  targets,
  initialListingId,
  initialTargetId,
  contextLabel =
    "Marketplace ranking",
  children,
}: PushUpLauncherProps) {
  const [open, setOpen] =
    useState(false);

  const normalizedTargets =
    useMemo(
      () =>
        targets ??
        listings.map(
          listingToPushUpTarget,
        ),
      [
        listings,
        targets,
      ],
    );

  const resolvedInitialTargetId =
    initialTargetId ??
    initialListingId;

  return (
    <>
      {children(() =>
        setOpen(true)
      )}

      {open && (
        <PushUpDialog
          targets={
            normalizedTargets
          }
          initialTargetId={
            resolvedInitialTargetId
          }
          contextLabel={
            contextLabel
          }
          onClose={() =>
            setOpen(false)
          }
        />
      )}
    </>
  );
}
