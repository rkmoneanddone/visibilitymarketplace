import {
  ListPlus,
  TrendingUp,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import {
  AccountControl,
} from "../../features/auth/AccountControl";

import {
  ListingLauncher,
} from "../../features/listings/ListingLauncher";

import {
  siteConfig,
} from "../../config/site";

import type {
  Listing,
} from "../../types/marketplace";

type SiteHeaderProps = {
  onListingCreated?: (
    listing: Listing,
  ) => void;
};

export function SiteHeader({
  onListingCreated,
}: SiteHeaderProps) {
  return (
    <header className="site-header">
      <Link
        className="brand"
        to="/"
      >
        <span className="brand-icon">
          <TrendingUp
            size={18}
            strokeWidth={2.5}
          />
        </span>

        {siteConfig.name}
      </Link>

      <nav className="main-nav">
        <Link to="/#board">
          Explore
        </Link>

        <Link to="/how-it-works">
          How it works
        </Link>

        <Link className="boards-nav-link" to="/boards">
          Boards
        </Link>

        <ListingLauncher
          onCreated={
            onListingCreated ??
            (() => { })
          }
        >
          {(openListing) => (
            <button
              type="button"
              className="add-link"
              onClick={openListing}
            >
              <ListPlus size={15} />
              Add Listing
            </button>
          )}
        </ListingLauncher>

        <AccountControl />
      </nav>
    </header>
  );
}