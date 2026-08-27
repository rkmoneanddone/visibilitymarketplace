import {
  useState,
  type ReactNode,
} from "react";

import type {
  Listing,
} from "../../types/marketplace";

import {
  PushUpDialog,
} from "./PushUpDialog";

type PushUpLauncherProps = {
  listings: Listing[];
  initialListingId?: string;
  contextLabel?: string;
  children: (
    openPushUp: () => void,
  ) => ReactNode;
};

export function PushUpLauncher({
  listings,
  initialListingId,
  contextLabel = "Marketplace ranking",
  children,
}: PushUpLauncherProps) {
  const [open, setOpen] =
    useState(false);

  return (
    <>
      {children(() => setOpen(true))}

      {open && (
        <PushUpDialog
          listings={listings}
          initialListingId={initialListingId}
          contextLabel={contextLabel}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
