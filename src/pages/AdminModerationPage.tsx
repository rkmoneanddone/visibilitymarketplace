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

import type {
  Board,
} from "../types/board";

import {
  getRequestedBoards,
} from "../services/boards/adminBoards";

import {
  approveBoardAsAdmin,
  rejectBoardAsAdmin,
} from "../services/boards/adminBoardModerationClient";

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
import {
  formatMoneyMinor,
} from "../lib/marketplace/money";



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

  const [
    activeTab,
    setActiveTab,
  ] = useState<
    "listings" | "boards"
  >("listings");

  const [boards, setBoards] =
    useState<Board[]>([]);

  const [
    processingBoardId,
    setProcessingBoardId,
  ] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (
      initializing ||
      !profile ||
      activeTab !== "boards"
    ) {
      return;
    }

    try {
      assertAdminAccess(
        profile,
      );
    } catch {
      return;
    }

    let active = true;

    async function loadBoards() {
      try {
        const result =
          await getRequestedBoards(
            25,
          );

        if (active) {
          setBoards(result);
        }
      } catch (error) {
        console.error(
          "Failed to load board requests:",
          error,
        );
      }
    }

    void loadBoards();

    return () => {
      active = false;
    };
  }, [
    activeTab,
    profile,
    initializing,
  ]);

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

  async function handleApproveBoard(
    boardId: string,
  ) {
    if (processingBoardId) {
      return;
    }

    try {
      setProcessingBoardId(
        boardId,
      );

      await approveBoardAsAdmin(
        boardId,
      );

      setBoards(
        (current) =>
          current.filter(
            (board) =>
              board.id !== boardId,
          ),
      );
    } catch (error) {
      console.error(
        "Board approval failed:",
        error,
      );

      window.alert(
        "Unable to approve board.",
      );
    } finally {
      setProcessingBoardId(
        null,
      );
    }
  }

  async function handleRejectBoard(
    boardId: string,
  ) {
    if (processingBoardId) {
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
      setProcessingBoardId(
        boardId,
      );

      await rejectBoardAsAdmin(
        boardId,
        reason,
      );

      setBoards(
        (current) =>
          current.filter(
            (board) =>
              board.id !== boardId,
          ),
      );
    } catch (error) {
      console.error(
        "Board rejection failed:",
        error,
      );

      window.alert(
        "Unable to reject board.",
      );
    } finally {
      setProcessingBoardId(
        null,
      );
    }
  }

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
            {activeTab === "listings"
              ? "Pending listings"
              : "Board requests"}
          </h1>
        </div>

        <span>
          {activeTab === "listings"
            ? listings.length
            : boards.length}{" "}
          pending
        </span>
      </header>

      <div className="admin-tabs">
        <button
          type="button"
          className={
            activeTab === "listings"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "listings",
            )
          }
        >
          Listings
        </button>

        <button
          type="button"
          className={
            activeTab === "boards"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "boards",
            )
          }
        >
          Board requests
        </button>
      </div>

      {activeTab === "listings" && (
        <>
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
                              {listing.title}
                            </h2>

                            <span>
                              {listing.status}
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
                            processingListingId !==
                            null
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
        </>
      )}
      {
        activeTab === "boards" && (
          <>
            {boards.length === 0 ? (
              <div className="admin-state">
                No pending board requests.
              </div>
            ) : (
              <div className="admin-list">
                {boards.map(
                  (board) => (
                    <article
                      className="admin-board-card"
                      key={board.id}
                    >
                      <div className="admin-board-top">
                        <div className="admin-board-heading">
                          <h2>{board.name}</h2>

                          <span className="admin-board-type">
                            {getListingTypeName(
                              board.listingTypeId,
                            )}
                          </span>
                        </div>

                        <span className="admin-board-status">
                          {board.status}
                        </span>
                      </div>

                      <div className="admin-board-requester">
                        <span>Requested by</span>

                        <strong>
                          {board.createdByDisplayName ||
                            board.createdByEmail ||
                            "Unknown user"}
                        </strong>

                        {board.createdByDisplayName &&
                          board.createdByEmail && (
                            <small>
                              {board.createdByEmail}
                            </small>
                          )}
                      </div>

                      <div className="admin-board-schedule">
                        <BoardInfo
                          label="Starts"
                          value={new Date(
                            board.startsAt,
                          ).toLocaleString(
                            undefined,
                            {
                              day: "numeric",
                              month: "short",
                              hour: "numeric",
                              minute: "2-digit",
                            },
                          )}
                        />

                        <BoardInfo
                          label="Entry opens"
                          value={new Date(
                            board.entryStartsAt,
                          ).toLocaleString(
                            undefined,
                            {
                              day: "numeric",
                              month: "short",
                              hour: "numeric",
                              minute: "2-digit",
                            },
                          )}
                        />

                        <BoardInfo
                          label="Entry closes"
                          value={new Date(
                            board.entryClosesAt,
                          ).toLocaleString(
                            undefined,
                            {
                              day: "numeric",
                              month: "short",
                              hour: "numeric",
                              minute: "2-digit",
                            },
                          )}
                        />

                        <BoardInfo
                          label="Ends"
                          value={new Date(
                            board.endsAt,
                          ).toLocaleString(
                            undefined,
                            {
                              day: "numeric",
                              month: "short",
                              hour: "numeric",
                              minute: "2-digit",
                            },
                          )}
                        />
                      </div>

                      <div className="admin-board-bottom">
                        <div className="admin-board-pricing">
                          <span>
                            Entry
                            <strong>
                              {formatMoneyMinor(
                                board.entryFeeMinor,
                                board.currency,
                              )}
                            </strong>
                          </span>

                          <span className="admin-board-dot">
                            ·
                          </span>

                          <span>
                            Min Push Up
                            <strong>
                              {formatMoneyMinor(
                                board.minimumBoostMinor,
                                board.currency,
                              )}
                            </strong>
                          </span>
                        </div>

                        <div className="admin-board-actions">
                          <button
                            type="button"
                            className="admin-reject-button"
                            disabled={
                              processingBoardId !== null
                            }
                            onClick={() =>
                              void handleRejectBoard(
                                board.id,
                              )
                            }
                          >
                            <X size={14} />

                            {processingBoardId ===
                              board.id
                              ? "Rejecting..."
                              : "Reject"}
                          </button>

                          <button
                            type="button"
                            className="admin-publish-button"
                            disabled={
                              processingBoardId !== null
                            }
                            onClick={() =>
                              void handleApproveBoard(
                                board.id,
                              )
                            }
                          >
                            <Check size={14} />

                            {processingBoardId ===
                              board.id
                              ? "Approving..."
                              : "Approve"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}
          </>
        )
      }
    </main >
  );
}
function BoardInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="admin-board-info">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

