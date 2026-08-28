import { useEffect, useMemo, useState } from "react";
import {
  ListingLauncher,
} from "../features/listings/ListingLauncher";

import {
  PlatformHandleLink,
} from "../features/listings/PlatformHandleLink";

import {
  ArrowUp,
  BarChart3,
  Eye,
  Flame,
  ListPlus,
  Rocket,
  Search,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { marketplaceConfig } from "../config/marketplace";
import { getListingTypeName } from "../lib/marketplace/listing";

import { formatMoneyMinor } from "../lib/marketplace/money";

import { getTypeIcon } from "../lib/marketplace/icons";
import { initialListingTypes } from "../config/listingTypes";
import { siteConfig } from "../config/site";
import { getPublishedListings } from "../services/firestore/listings";
import { getPublicBoards } from "../services/boards/boards";
import type { Listing } from "../types/marketplace";
import type { Board } from "../types/board";
import { PushUpLauncher } from "../features/push-up/PushUpLauncher";
import {
  recordExternalClick,
} from "../services/analytics/clickTracking";

import {
  BoardEntryLauncher,
} from "../features/boards/BoardEntryLauncher";

function listingTimestamp(
  listing: Listing,
): number {
  const value =
    listing.publishedAt ??
    listing.createdAt;

  if (!value) {
    return 0;
  }

  const timestamp =
    new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

function compareListingRank(
  a: Listing,
  b: Listing,
): number {
  const boostDifference =
    (b.currentBoostTotalMinor ?? 0) -
    (a.currentBoostTotalMinor ?? 0);

  if (boostDifference !== 0) {
    return boostDifference;
  }

  const dateDifference =
    listingTimestamp(b) -
    listingTimestamp(a);

  if (dateDifference !== 0) {
    return dateDifference;
  }

  return a.id.localeCompare(b.id);
}

export function HomePage() {
  const [selectedType, setSelectedType] =
    useState(() => {
      if (typeof window === "undefined") {
        return "All";
      }

      const typeParam =
        new URLSearchParams(
          window.location.search,
        )
          .get("type")
          ?.trim()
          .toLowerCase();

      if (!typeParam) {
        return "All";
      }

      const matchedType =
        initialListingTypes.find(
          (type) =>
            type.enabled &&
            (
              type.key.toLowerCase() ===
                typeParam ||
              type.id.toLowerCase() ===
                typeParam
            ),
        );

      return matchedType?.name ?? "All";
    });
  const [selectedPeriod, setSelectedPeriod] =
    useState("this-week");
  const [searchQuery, setSearchQuery] =
    useState(() => {
      if (typeof window === "undefined") {
        return "";
      }

      return new URLSearchParams(
        window.location.search,
      ).get("q") ?? "";
    });
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);


  useEffect(() => {
    let active = true;

    async function loadListings() {
      try {
        setListingsLoading(true);
        setListingsError(null);

        const publishedListings = await getPublishedListings();

        if (active) {
          setListings(publishedListings);
        }
      } catch (error) {
        console.error("Failed to load marketplace listings:", error);

        if (active) {
          setListingsError("Unable to load listings right now.");
        }
      } finally {
        if (active) {
          setListingsLoading(false);
        }
      }
    }

    void loadListings();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handlePopState() {
      const params =
        new URLSearchParams(
          window.location.search,
        );

      const typeParam =
        params
          .get("type")
          ?.trim()
          .toLowerCase();

      const matchedType =
        initialListingTypes.find(
          (type) =>
            type.enabled &&
            (
              type.key.toLowerCase() ===
                typeParam ||
              type.id.toLowerCase() ===
                typeParam
            ),
        );

      setSelectedType(
        matchedType?.name ?? "All",
      );

      setSearchQuery(
        params.get("q") ?? "",
      );
    }

    window.addEventListener(
      "popstate",
      handlePopState,
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState,
      );
    };
  }, []);

  function selectListingType(
    typeName: string,
  ) {
    setSelectedType(typeName);

    const params =
      new URLSearchParams(
        window.location.search,
      );

    if (typeName === "All") {
      params.delete("type");
    } else {
      const type =
        initialListingTypes.find(
          (item) =>
            item.name === typeName,
        );

      if (type) {
        params.set(
          "type",
          type.key,
        );
      }
    }

    const nextSearch =
      params.toString();

    window.history.pushState(
      {},
      "",
      nextSearch
        ? `${window.location.pathname}?${nextSearch}`
        : window.location.pathname,
    );
  }

  function updateSearchQuery(
    value: string,
  ) {
    setSearchQuery(value);

    const params =
      new URLSearchParams(
        window.location.search,
      );

    const normalized =
      value.trim();

    if (normalized) {
      params.set("q", normalized);
    } else {
      params.delete("q");
    }

    const nextSearch =
      params.toString();

    window.history.replaceState(
      {},
      "",
      nextSearch
        ? `${window.location.pathname}?${nextSearch}`
        : window.location.pathname,
    );
  }
  const enabledTypes = useMemo(
    () =>
      initialListingTypes
        .filter((type) => type.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [],
  );

  const typeOrder =
    new Map(
      enabledTypes.map(
        (type, index) => [
          type.id,
          index,
        ],
      ),
    );

  const rankedListings =
    [...listings].sort(
      (a, b) => {
        if (
          selectedType === "All"
        ) {
          const aTypeOrder =
            typeOrder.get(
              a.listingTypeId,
            ) ??
            Number.MAX_SAFE_INTEGER;

          const bTypeOrder =
            typeOrder.get(
              b.listingTypeId,
            ) ??
            Number.MAX_SAFE_INTEGER;

          if (
            aTypeOrder !==
            bTypeOrder
          ) {
            return (
              aTypeOrder -
              bTypeOrder
            );
          }
        }

        return compareListingRank(
          a,
          b,
        );
      },
    );

  const typeListings =
    selectedType === "All"
      ? rankedListings
      : rankedListings.filter(
          (listing) =>
            getListingTypeName(
              listing.listingTypeId,
            ) === selectedType,
        );

  const normalizedSearch =
    searchQuery
      .trim()
      .toLowerCase();

  const visibleListings =
    !normalizedSearch
      ? typeListings
      : typeListings.filter(
          (listing) =>
            [
              listing.title,
              listing.handle,
              listing.shortDescription,
              listing.ownerDisplayName,
            ]
              .filter(Boolean)
              .some((value) =>
                String(value)
                  .toLowerCase()
                  .includes(
                    normalizedSearch,
                  ),
              ),
        );

  const typeCounts =
    enabledTypes.reduce<
      Record<string, number>
    >(
      (counts, type) => {
        counts[type.name] =
          listings.filter(
            (listing) =>
              listing.listingTypeId ===
              type.id,
          ).length;

        return counts;
      },
      {},
    );

  const todayKey =
    new Date().toDateString();

  const newTodayListings =
    typeListings.filter(
      (listing) => {
        const timestamp =
          listing.publishedAt ??
          listing.createdAt;

        if (!timestamp) {
          return false;
        }

        const date =
          new Date(timestamp);

        return (
          !Number.isNaN(
            date.getTime(),
          ) &&
          date.toDateString() ===
            todayKey
        );
      },
    );
  const boardStats = {
    listed: typeListings.length,

    today: newTodayListings.length,

    pushedMinor: typeListings.reduce(
      (total, listing) =>
        total + listing.currentBoostTotalMinor,
      0,
    ),
  };



  return (
    <>


      <main className="page-shell">
        <section className="compact-intro">
          <div className="intro-content">
            <p className="eyebrow">
              <Sparkles size={14} />
              {marketplaceConfig.homepage.eyebrow}
            </p>

            <h1>{marketplaceConfig.homepage.headline}</h1>

            <div className="intro-side">
              <p>{marketplaceConfig.homepage.description}</p>
            </div>
          </div>
        </section>
<div className="market-layout">
          <section className="board-section" id="board">
            <div
              className="market-visitor-strip"
              aria-hidden="true"
              title="Visitor totals will appear here after real analytics data is connected."
            >
              <span>Total visitors</span>
              <strong>ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â½</strong>
              <span>Live</span>
              <strong>ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â½</strong>
            </div>

            <div className="type-strip">
              <button
                className={`type-link ${selectedType === "All" ? "active" : ""}`}
                type="button"
                onClick={() => selectListingType("All")}
              >
                <Sparkles size={15} />
                <span>All</span>
                <span className="type-count">
                  {listings.length}
                </span>
              </button>

              {enabledTypes.map((type) => (
                <button
                  className={`type-link ${selectedType === type.name ? "active" : ""
                    }`}
                  type="button"
                  key={type.id}
                  onClick={() => selectListingType(type.name)}
                >
                  {getTypeIcon(type.name)}
                  <span>{type.name}</span>
                  <span className="type-count">
                    {typeCounts[type.name] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            <div className="mobile-stats">
              <span>
                <strong>{boardStats.listed}</strong>
                listed
              </span>
              <span>
                <strong>{boardStats.today}</strong>
                new today
              </span>
              <span>
                <strong>{formatMoneyMinor(boardStats.pushedMinor)}</strong>
                pushed
              </span>
            </div>

            <div className="board-heading">
              <div>
                <p className="eyebrow">
                  <Flame size={14} />
                  {selectedType === "All"
                    ? "TOP BOARD"
                    : `${selectedType.toUpperCase()} BOARD`}
                </p>
                <h2>Move a listing higher</h2>
              </div>

              <select
                className="board-period-select"
                value={selectedPeriod}
                onChange={(event) =>
                  setSelectedPeriod(event.target.value)
                }
                aria-label="Board period"
              >
                <option value="this-week">
                  This week
                </option>
                <option value="week-1">
                  1 week back
                </option>
                <option value="week-2">
                  2 weeks back
                </option>
                <option value="week-3">
                  3 weeks back
                </option>
                <option value="last-month">
                  Last month
                </option>
              </select>
            </div>

            <div className="filters home-search-only">
              <div className="search-field">
                <Search size={16} />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) =>
                    updateSearchQuery(
                      event.target.value,
                    )
                  }
                  placeholder={
                    selectedType === "All"
                      ? "Search all listings"
                      : `Search ${selectedType} listings`
                  }
                  aria-label={
                    selectedType === "All"
                      ? "Search all listings"
                      : `Search ${selectedType} listings`
                  }
                />
              </div>
            </div>

<div className="board-list marketplace-listing-list">
              {selectedPeriod !== "this-week" ? (
                <div className="empty-board historical-board-note">
                  Historical ranking for this period is not connected yet.
                </div>
              ) : listingsLoading ? (
                <div className="empty-board">Loading listings...</div>
              ) : listingsError ? (
                <div className="empty-board">{listingsError}</div>
              ) : visibleListings.length > 0 ? (
                visibleListings.map((listing, index) => {
                  const typeName = getListingTypeName(listing.listingTypeId);

                  const rank =
                    selectedType === "All"
                      ? visibleListings
                          .slice(
                            0,
                            index + 1,
                          )
                          .filter(
                            (candidate) =>
                              candidate.listingTypeId ===
                              listing.listingTypeId,
                          ).length
                      : index + 1;

                  return (
                    <article
                      className={`board-row marketplace-listing-row rank-${Math.min(rank, 4)}`}
                      key={listing.id}
                    >
                      <div className="rank">
                        #{rank}
                      </div>

                      <div
                        className={`listing-mark listing-mark-${typeName
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {listing.featuredImageUrl ? (
                          <img
                            src={listing.featuredImageUrl}
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          listing.title.charAt(0)
                        )}
                      </div>

                      <div className="listing-content">
                        <div className="listing-title-line">
                          <h3>{listing.title}</h3>

                          {rank === 1 && (
                            <span className="rank-badge badge-top">
                              #1
                            </span>
                          )}
                        </div>

                        <div className="marketplace-listing-identity">
                          {listing.ownerDisplayName && (
                            <span className="marketplace-listing-owner">
                              {listing.ownerDisplayName}
                            </span>
                          )}

                          {listing.handle && (
                            <span className="listing-meta">
                              <PlatformHandleLink
                                typeName={typeName}
                                handle={listing.handle}
                                platformUrl={listing.platformUrl}
                              />
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="listing-score">
                        <strong>
                          {formatMoneyMinor(
                            listing.currentBoostTotalMinor,
                          )}
                        </strong>
                        <span>pushed</span>
                        <span className="listing-click-count">
                          {listing.externalClicks ?? 0} clicks
                        </span>
                      </div>

                      <div className="listing-actions">
                        <a
                          className="visit-button"
                          href={listing.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                            onClick={() =>
                              void recordExternalClick(
                                "listing",
                                listing.id,
                              )
                            }                        >
                          Visit
                        </a>

                        <PushUpLauncher
                          listings={visibleListings}
                          initialListingId={listing.id}
                          contextLabel={`${selectedType} ranking`}
                        >
                          {(openPushUp) => (
                            <button
                              className="push-button"
                              type="button"
                              onClick={openPushUp}
                            >
                              <ArrowUp size={14} strokeWidth={2.5} />
                              Push Up
                            </button>
                          )}
                        </PushUpLauncher>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="empty-board">
                  {searchQuery.trim()
                    ? `No ${selectedType === "All" ? "" : `${selectedType} `}listings match "${searchQuery.trim()}".`
                    : `No ${selectedType === "All" ? "published" : selectedType} listings yet.`}
                </div>
              )}
            </div>

            <BoardsPreview />

            <div className="market-model-strip">
              <div className="market-model-price">
                <span className="free-pill">
                  {marketplaceConfig.pricing.freeListingLabel}
                </span>
                <span className="model-or">OR</span>
                <span className="vip-pill">
                  <Zap size={13} />
                  {marketplaceConfig.pricing.boardVisibilityLabel}
                </span>
              </div>

              <p>
                List for free. Get discovered. Support any listing to push it higher.
              </p>

              <span className="market-refund-note">
                Paid visibility is non-refundable after successful processing.
              </span>

              <a href="/how-it-works">How it works</a>
            </div>

            <div className="board-bottom">
              <span>Ranking is based on paid pushes this board period.</span>
              <button type="button">View all</button>
            </div>

            <div className="mobile-side-content">
              <VisibilityCard />
              <NewTodayCard listings={newTodayListings} />
              <HowItWorksCard />
            </div>
          </section>

          <aside className="side-panel">

            <VisibilityCard />
            <NewTodayCard listings={newTodayListings} />
            <HowItWorksCard />
            <section className="board-summary">
              <div className="side-card-heading">
                <span className="side-icon summary-icon">
                  <BarChart3 size={18} />
                </span>
                <div>
                  <p className="eyebrow">THIS BOARD</p>
                  <h3>
                    {selectedType === "All" ? "All listings" : selectedType}
                  </h3>
                </div>
              </div>

              <div className="summary-grid">
                <div>
                  <strong>{boardStats.listed}</strong>
                  <span>listed</span>
                </div>

                <div>
                  <strong>{boardStats.today}</strong>
                  <span>new today</span>
                </div>

                <div>
                  <strong>{formatMoneyMinor(boardStats.pushedMinor)}</strong>
                  <span>pushed</span>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <section className="seo-content">
          <div>
            <p className="eyebrow">DISCOVER MORE</p>
            <h2>A marketplace for attention.</h2>
          </div>

          <p>
            Discover emerging YouTube channels, Instagram creators, Facebook
            pages, apps, websites and startups. Listings compete for visibility
            while supporters can help the projects they like move higher on
            the public board.
          </p>

          <div className="seo-links">
            <a href="#youtube">YouTube channels</a>
            <a href="#instagram">Instagram creators</a>
            <a href="#apps">Apps</a>
            <a href="#startups">Startups</a>
            <a href="#websites">Websites</a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <a className="brand" href="/">
              <span className="brand-icon">
                <TrendingUp size={17} />
              </span>
              {siteConfig.name}
            </a>

            <p>
              Discover it. Support it. Push it higher.
            </p>
          </div>

          <div className="footer-column">
            <strong>Discover</strong>
            <a href="#board">Top listings</a>
            <a href="#new">New today</a>
            <a href="#youtube">YouTube</a>
            <a href="#apps">Apps & startups</a>
          </div>

          <div className="footer-column">
            <strong>For listings</strong>
            <a href="#add-listing">Add Public Listing</a>
            <a href="#pricing">Pricing</a>
            <a href="/how-it-works">How it works</a>
          </div>

          <div className="footer-column">
            <strong>Company</strong>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>Copyright 2026 {siteConfig.name}</span>
          <span>Built for discovery.</span>
        </div>
      </footer>
    </>
  );
}




function handleListingCreated(
  listing: Listing,
) {
  console.log(
    "Listing submitted:",
    listing.id,
  );
}

function BoardsPreview() {
  const [boards, setBoards] =
    useState<Board[]>([]);

  useEffect(() => {
    let active = true;

    async function loadBoards() {
      try {
        const result =
          await getPublicBoards();

        if (active) {
          setBoards(
            result.slice(0, 2),
          );
        }
      } catch (error) {
        console.error(
          "Failed to load Board preview:",
          error,
        );
      }
    }

    void loadBoards();

    return () => {
      active = false;
    };
  }, []);

  if (boards.length === 0) {
    return null;
  }

  return (
    <section className="home-boards-preview">
      <div className="home-boards-preview-heading">
        <div>
          <span>BOARDS</span>

          <h2>
            Compete for a featured spot
          </h2>
        </div>

        <a href="/boards">
          See all boards
        </a>
      </div>

      <div className="home-boards-preview-list">
        {boards.map(
          (board) => (
            <div
              className="home-board-preview-row"
              key={board.id}
            >
              <span className="home-board-preview-accent" />

              <span className="home-board-preview-status">
                {board.status === "active" ||
                board.status === "entry_open"
                  ? "LIVE"
                  : "OPEN"}
              </span>

              <span className="home-board-preview-copy">
                <span className="home-board-preview-title">
                  {board.name}
                </span>

                <span className="home-board-preview-meta">
                  {getListingTypeName(
                    board.listingTypeId,
                  )}
                  {" | "}
                  Entry{" "}
                  {formatMoneyMinor(
                    board.entryFeeMinor,
                    board.currency,
                  )}
                  {" | "}
                  Push from{" "}
                  {formatMoneyMinor(
                    board.minimumBoostMinor,
                    board.currency,
                  )}
                </span>

              </span>

              <span className="home-board-preview-actions">
                <BoardEntryLauncher
                  board={board}
                >
                  {(openEntry) => (
                    <button
                      className="home-board-preview-add"
                      type="button"
                      onClick={openEntry}
                    >Enter This Board</button>
                  )}
                </BoardEntryLauncher>

                <a
                  className="home-board-preview-action"
                  href={`/boards/${board.id}`}
                >
                  View Board
                </a>
              </span>
            </div>
          ),
        )}
      </div>
    </section>
  );
}

function VisibilityCard() {
  return (
    <section className="visibility-cta" id="add-listing">
      <div className="side-card-heading">
        <span className="side-icon visibility-icon">
          <Rocket size={18} />
        </span>

        <div>
          <p className="eyebrow">GET MORE VISIBILITY</p>
          <h3>Ready to get noticed?</h3>
        </div>
      </div>

      <p>
        Put your channel, app, website or startup on the public marketplace.
      </p>

      <ListingLauncher
        onCreated={
          handleListingCreated
        }
      >
        {(openListing) => (
          <button
            type="button"
            onClick={openListing}
          >
            <ListPlus size={15} />Add Public Listing</button>
        )}
      </ListingLauncher>
    </section>
  );
}

function NewTodayCard({
  listings,
}: {
  listings: Listing[];
}) {
  const shownListings =
    listings.slice(0, 3);

  return (
    <section
      className="side-section new-today-card"
      id="new"
    >
      <div className="side-title">
        <div className="side-card-heading">
          <span className="side-icon new-icon">
            <Sparkles size={17} />
          </span>

          <p className="eyebrow">
            NEW TODAY
          </p>
        </div>

        <span>
          {shownListings.length} shown
        </span>
      </div>

      {shownListings.length > 0 ? (
        <div className="new-list">
          {shownListings.map(
            (listing) => (
              <a
                href={listing.externalUrl}
                target="_blank"
                rel="noreferrer"
                key={listing.id}
              >
                <strong>
                  {listing.title}
                </strong>

                <span>
                  {getListingTypeName(
                    listing.listingTypeId,
                  )}
                </span>
              </a>
            ),
          )}
        </div>
      ) : (
        <p className="new-today-empty">
          No new listings today.
        </p>
      )}

      <button
        className="text-action"
        type="button"
        onClick={() => {
          const board =
            document.getElementById(
              "board",
            );

          board?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }}
      >
        View all listings
      </button>
    </section>
  );
}

function HowItWorksCard() {
  return (
    <section className="side-section how-card" id="how">
      <div className="side-card-heading">
        <span className="side-icon how-icon">
          <TrendingUp size={18} />
        </span>

        <div>
          <p className="eyebrow">HOW IT WORKS</p>
          <h3>Visibility powered by support.</h3>
        </div>
      </div>

      <p className="how-intro">
        List what you want discovered. The community can support it and
        push it higher in the marketplace.
      </p>

      <ol className="how-list">
        <li>
          <span className="how-step-icon">
            <ListPlus size={17} />
          </span>

          <div>
            <strong>1. List</strong>
            <span>
              Add your channel, app, website, startup or project.
            </span>
          </div>
        </li>

        <li>
          <span className="how-step-icon">
            <Eye size={17} />
          </span>

          <div>
            <strong>2. Get discovered</strong>
            <span>
              Appear on the public marketplace, search and category filters.
            </span>
          </div>
        </li>

        <li>
          <span className="how-step-icon push-step">
            <ArrowUp size={17} />
          </span>

          <div>
            <strong>3. Push Up</strong>
            <span>
              Owners, fans and visitors can support a listing and move it
              higher.
            </span>
          </div>
        </li>
      </ol>

      <div className="how-result">
        <TrendingUp size={17} />

        <div>
          <strong>More support. More visibility.</strong>
          <span>The board rewards the listings people want others to see.</span>
        </div>
      </div>
    </section>
  );
}
