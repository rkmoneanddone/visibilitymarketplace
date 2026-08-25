import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Archive,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LayoutDashboard,
  Plus,
  XCircle,
} from "lucide-react";

import {
  useAuth,
} from "../features/auth/AuthProvider";

import {
  PageBreadcrumb,
} from "../components/layout/PageBreadcrumb";

import {
  PlatformHandleLink,
} from "../features/listings/PlatformHandleLink";

import {
  ListingLauncher,
} from "../features/listings/ListingLauncher";

import {
  getMyListings,
} from "../services/listings/myListings";

import {
  getCategoryName,
  getListingTypeName,
  getSubcategoryName,
} from "../lib/marketplace/listing";

import type {
  Listing,
} from "../types/marketplace";

import {
  archiveListingAsOwner,
} from "../services/listings/adminModerationClient";

import "./my-dashboard.css";

type DashboardFilter =
  | "all"
  | "pending"
  | "published"
  | "rejected"
  | "archived";

export function MyDashboardPage() {
  const {
    profile,
    initializing,
  } = useAuth();

  const [listings, setListings] =
    useState<Listing[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [filter, setFilter] =
    useState<DashboardFilter>(
      "all",
    );

  const [
    processingListingId,
    setProcessingListingId,
  ] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (initializing) {
      return;
    }

    if (!profile) {
      setLoading(false);
      setError(
        "Sign in to view your dashboard.",
      );
      return;
    }

    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const result =
          await getMyListings(
            profile!.uid,
          );

        if (active) {
          setListings(result);
        }
      } catch (error) {
        console.error(
          "Failed to load user listings:",
          error,
        );

        if (active) {
          setError(
            "Unable to load your listings.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [
    profile,
    initializing,
  ]);

  async function handleArchive(
    listingId: string,
  ) {
    if (processingListingId) {
      return;
    }

    const confirmed =
      window.confirm(
        "Revoke this listing? It will be removed from the public board and moved to Archived.",
      );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingListingId(
        listingId,
      );

      await archiveListingAsOwner(
        listingId,
      );

      setListings(
        (current) =>
          current.map(
            (listing) =>
              listing.id === listingId
                ? {
                  ...listing,
                  status: "archived",
                }
                : listing,
          ),
      );
    } catch (error) {
      console.error(
        "Archive failed:",
        error,
      );

      window.alert(
        "Unable to revoke listing.",
      );
    } finally {
      setProcessingListingId(
        null,
      );
    }
  }

  const counts = useMemo(
    () => ({
      all: listings.length,

      pending:
        listings.filter(
          (listing) =>
            listing.status ===
            "submitted" ||
            listing.status ===
            "under_review",
        ).length,

      published:
        listings.filter(
          (listing) =>
            listing.status ===
            "published",
        ).length,

      rejected:
        listings.filter(
          (listing) =>
            listing.status ===
            "rejected",
        ).length,

      archived:
        listings.filter(
          (listing) =>
            listing.status ===
            "archived",
        ).length,
    }),
    [listings],
  );

  const visibleListings =
    useMemo(() => {
      if (filter === "all") {
        return listings;
      }

      if (filter === "pending") {
        return listings.filter(
          (listing) =>
            listing.status ===
            "submitted" ||
            listing.status ===
            "under_review",
        );
      }

      return listings.filter(
        (listing) =>
          listing.status === filter,
      );
    }, [
      listings,
      filter,
    ]);

  function handleListingCreated(
    listing: Listing,
  ) {
    setListings(
      (current) => [
        listing,
        ...current,
      ],
    );
  }

  if (initializing) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-state">
          Loading...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-state">
          {error}
        </div>
      </main>
    );
  }

  return (

    <main className="dashboard-page">
      <PageBreadcrumb
        items={[
          {
            label: "Home",
            to: "/",
          },
          {
            label: "My listings",
          },
        ]}
      />
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">
            <LayoutDashboard
              size={14}
            />
            MY DASHBOARD
          </p>

          <h1>
            My listings
          </h1>
        </div>

        <ListingLauncher
          onCreated={
            handleListingCreated
          }
        >
          {(openListing) => (
            <button
              type="button"
              className="dashboard-add-button"
              onClick={openListing}
            >
              <Plus size={15} />
              Add Listing
            </button>
          )}
        </ListingLauncher>
      </header>

      <div className="dashboard-tabs">
        <FilterButton
          active={filter === "all"}
          onClick={() =>
            setFilter("all")
          }
          label="All"
          count={counts.all}
        />

        <FilterButton
          active={
            filter === "pending"
          }
          onClick={() =>
            setFilter("pending")
          }
          label="Pending"
          count={counts.pending}
        />

        <FilterButton
          active={
            filter === "published"
          }
          onClick={() =>
            setFilter("published")
          }
          label="Published"
          count={counts.published}
        />

        <FilterButton
          active={
            filter === "rejected"
          }
          onClick={() =>
            setFilter("rejected")
          }
          label="Rejected"
          count={counts.rejected}
        />

        <FilterButton
          active={
            filter === "archived"
          }
          onClick={() =>
            setFilter("archived")
          }
          label="Archived"
          count={counts.archived}
        />
      </div>

      {loading ? (
        <div className="dashboard-state">
          Loading your listings...
        </div>
      ) : visibleListings.length ===
        0 ? (
        <div className="dashboard-state">
          No listings in this view.
        </div>
      ) : (
        <div className="dashboard-list">
          {visibleListings.map(
            (listing) => {
              const typeName =
                getListingTypeName(
                  listing.listingTypeId,
                );

              const categoryName =
                getCategoryName(
                  listing.categoryId,
                );

              const subcategoryName =
                getSubcategoryName(
                  listing.categoryId,
                  listing.subcategoryId,
                );

              return (
                <article
                  className="dashboard-listing"
                  key={listing.id}
                >
                  <div className="dashboard-listing-image">
                    {listing.featuredImageUrl ? (
                      <img
                        src={
                          listing.featuredImageUrl
                        }
                        alt=""
                      />
                    ) : (
                      listing.title
                        .charAt(0)
                        .toUpperCase()
                    )}
                  </div>

                  <div className="dashboard-listing-content">
                    <div className="dashboard-title-line">
                      <h2>
                        {listing.title}
                      </h2>

                      <StatusBadge
                        status={
                          listing.status
                        }
                      />
                    </div>

                    <div className="dashboard-meta">
                      <span>
                        {typeName}
                      </span>

                      <span>
                        {categoryName}
                      </span>

                      {subcategoryName && (
                        <span>
                          {
                            subcategoryName
                          }
                        </span>
                      )}

                      {listing.handle && (
                        <PlatformHandleLink
                          typeName={
                            typeName
                          }
                          handle={
                            listing.handle
                          }
                          platformUrl={
                            listing.platformUrl
                          }
                        />
                      )}
                    </div>

                    <p>
                      {
                        listing.shortDescription
                      }
                    </p>

                    {listing.status ===
                      "rejected" &&
                      listing.rejectionReason && (
                        <div className="dashboard-rejection">
                          Rejection reason:{" "}
                          {
                            listing.rejectionReason
                          }
                        </div>
                      )}
                  </div>

                  <div className="dashboard-actions">
                    <a
                      href={
                        listing.externalUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      Visit
                      <ExternalLink
                        size={13}
                      />
                    </a>

                    {listing.status ===
                      "published" && (
                        <button
                          type="button"
                          disabled={
                            processingListingId !== null
                          }
                          onClick={() =>
                            void handleArchive(
                              listing.id,
                            )
                          }
                        >
                          <Archive size={14} />

                          {processingListingId ===
                            listing.id
                            ? "Revoking..."
                            : "Revoke"}
                        </button>
                      )}
                  </div>
                </article>
              );
            },
          )}
        </div>
      )}
    </main>
  );
}

function FilterButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      className={
        active ? "active" : ""
      }
      onClick={onClick}
    >
      {label}
      <span>{count}</span>
    </button>
  );
}

function StatusBadge({
  status,
}: {
  status: Listing["status"];
}) {
  if (status === "published") {
    return (
      <span className="dashboard-status published">
        <CheckCircle2 size={12} />
        Published
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="dashboard-status rejected">
        <XCircle size={12} />
        Rejected
      </span>
    );
  }

  if (status === "archived") {
    return (
      <span className="dashboard-status archived">
        <Archive size={12} />
        Archived
      </span>
    );
  }

  return (
    <span className="dashboard-status pending">
      <Clock3 size={12} />
      Pending
    </span>
  );
}