import {
  useEffect,
  useState,
} from "react";

import {
  Check,
  ExternalLink,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  PlatformHandleLink,
} from "../features/listings/PlatformHandleLink";

import {
  publishListingAsAdmin,
  rejectListingAsAdmin,
} from "../services/listings/adminModerationClient";

import {
  useAuth,
} from "../features/auth/AuthProvider";

import {
  assertAdminAccess,
} from "../features/admin/moderationAccess";

import {
  getPendingListings,
} from "../services/listings/adminListings";

import type {
  Listing,
} from "../types/marketplace";

import {
  getListingTypeName,
  getCategoryName,
  getSubcategoryName,
} from "../lib/marketplace/listing";

import {
  getTypeIcon,
} from "../lib/marketplace/icons";

import "./admin-moderation.css";

export function AdminModerationPage() {
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
      setError(
        "Admin access required.",
      );
      setLoading(false);
      return;
    }

    try {
      assertAdminAccess(
        profile,
      );
    } catch {
      setError(
        "Admin access required.",
      );

      setLoading(false);
      return;
    }

    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const result =
          await getPendingListings(
            25,
          );

        if (active) {
          setListings(result);
        }
      } catch (error) {
        console.error(
          "Failed to load pending listings:",
          error,
        );

        if (active) {
          setError(
            "Unable to load pending listings.",
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

  async function handlePublish(
    listingId: string,
  ) {
    if (processingListingId) {
      return;
    }

    try {
      setProcessingListingId(
        listingId,
      );

      await publishListingAsAdmin(
        listingId,
      );

      setListings(
        (current) =>
          current.filter(
            (listing) =>
              listing.id !==
              listingId,
          ),
      );
    } catch (error) {
      console.error(
        "Publish failed:",
        error,
      );

      window.alert(
        "Unable to publish listing.",
      );
    } finally {
      setProcessingListingId(
        null,
      );
    }
  }

  async function handleReject(
    listingId: string,
  ) {
    if (processingListingId) {
      return;
    }

    const reason =
      window.prompt(
        "Reason for rejection:",
      )?.trim();

    if (!reason) {
      return;
    }

    try {
      setProcessingListingId(
        listingId,
      );

      await rejectListingAsAdmin(
        listingId,
        reason,
      );

      setListings(
        (current) =>
          current.filter(
            (listing) =>
              listing.id !== listingId,
          ),
      );
    } catch (error) {
      console.error(
        "Reject failed:",
        error,
      );

      window.alert(
        "Unable to reject listing.",
      );
    } finally {
      setProcessingListingId(
        null,
      );
    }
  }

  if (initializing) {
    return (
      <main className="admin-page">
        <div className="admin-state">
          Loading...
        </div>
      </main>
    );
  }


  if (error) {
    return (
      <main className="admin-page">
        <div className="admin-state">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">
            <ShieldCheck size={14} />
            ADMIN MODERATION
          </p>

          <h1>
            Pending listings
          </h1>
        </div>

        <span>
          {listings.length} pending
        </span>
      </header>

      {loading ? (
        <div className="admin-state">
          Loading submissions...
        </div>
      ) : listings.length === 0 ? (
        <div className="admin-state">
          No pending listings.
        </div>
      ) : (
        <div className="admin-list">
          {listings.map(
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
                  className="admin-listing"
                  key={listing.id}
                >
                  <div className="admin-listing-main">
                    <div className="admin-listing-image">
                      {listing.featuredImageUrl ? (
                        <img
                          src={
                            listing.featuredImageUrl
                          }
                          alt=""
                        />
                      ) : (
                        getTypeIcon(
                          typeName,
                        )
                      )}
                    </div>

                    <div className="admin-listing-content">
                      <div className="admin-listing-title">
                        <h2>
                          {
                            listing.title
                          }
                        </h2>

                        <span>
                          {
                            listing.status
                          }
                        </span>
                      </div>

                      <p className="admin-listing-meta">
                        <span>
                          {getTypeIcon(
                            typeName,
                          )}
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
                            typeName={typeName}
                            handle={listing.handle}
                            platformUrl={
                              listing.platformUrl
                            }
                          />
                        )}
                      </p>

                      <p className="admin-listing-description">
                        {
                          listing.shortDescription
                        }
                      </p>

                      <div className="admin-listing-links">
                        <a
                          href={
                            listing.externalUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open listing
                          <ExternalLink
                            size={13}
                          />
                        </a>

                        {listing.platformUrl &&
                          listing.platformUrl !==
                          listing.externalUrl && (
                            <a
                              href={
                                listing.platformUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              Platform profile
                              <ExternalLink
                                size={13}
                              />
                            </a>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="admin-listing-actions">
                    <button
                      type="button"
                      className="admin-reject-button"
                      disabled={
                        processingListingId !== null
                      }
                      onClick={() =>
                        void handleReject(
                          listing.id,
                        )
                      }
                    >
                      <X size={14} />

                      {processingListingId ===
                        listing.id
                        ? "Rejecting..."
                        : "Reject"}
                    </button>

                    <button
                      type="button"
                      className="admin-publish-button"
                      disabled={
                        processingListingId !==
                        null
                      }
                      onClick={() =>
                        void handlePublish(
                          listing.id,
                        )
                      }
                    >
                      <Check size={14} />

                      {processingListingId ===
                        listing.id
                        ? "Publishing..."
                        : "Publish"}
                    </button>
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