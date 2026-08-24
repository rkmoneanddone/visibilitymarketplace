import { useEffect, useMemo, useState } from "react";
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
  Users,
  Zap,
} from "lucide-react";
import { marketplaceConfig } from "../config/marketplace";
import {
  getCategoryName,
  getListingTypeName,
  getSubcategoryName,
} from "../lib/marketplace/listing";

import { formatMoneyMinor } from "../lib/marketplace/money";

import { getTypeIcon } from "../lib/marketplace/icons";
import {
  demoBoardStats,
  newToday,
} from "../data/demoMarketplace";
import { initialCategories } from "../config/categories";
import { initialListingTypes } from "../config/listingTypes";
import { siteConfig } from "../config/site";
import { getPublishedListings } from "../services/firestore/listings";
import type { Listing } from "../types/marketplace";


export function HomePage() {
  const [selectedType, setSelectedType] = useState("All");
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

  const enabledTypes = useMemo(
    () =>
      initialListingTypes
        .filter((type) => type.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [],
  );

  const visibleListings =
  selectedType === "All"
    ? listings
    : listings.filter(
        (listing) =>
          getListingTypeName(listing.listingTypeId) === selectedType,
      );

  const boardStats = {
  listed: visibleListings.length,

  today: demoBoardStats.newToday,

  pushedMinor: visibleListings.reduce(
    (total, listing) =>
      total + listing.currentBoostTotalMinor,
    0,
  ),
};

  return (
    <>
      <header className="site-header">
        <a className="brand" href="/">
          <span className="brand-icon">
            <TrendingUp size={18} strokeWidth={2.5} />
          </span>
          {siteConfig.name}
        </a>

        <nav className="main-nav">
          <a href="#board">Explore</a>
          <a href="#how">How it works</a>
          <a className="add-link" href="#add-listing">
            <ListPlus size={15} />
            Add Listing
          </a>
          <a href="#signin">Sign in</a>
        </nav>
      </header>

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

  <a href="#add-listing">
    {marketplaceConfig.homepage.listingCta}
  </a>
</div>
          </div>
        </section>

        <div className="market-layout">
          <section className="board-section" id="board">
            <div className="type-strip">
              <button
                className={`type-link ${selectedType === "All" ? "active" : ""}`}
                type="button"
                onClick={() => setSelectedType("All")}
              >
                <Sparkles size={15} />
                <span>All</span>
              </button>

              {enabledTypes.map((type) => (
                <button
                  className={`type-link ${selectedType === type.name ? "active" : ""
                    }`}
                  type="button"
                  key={type.id}
                  onClick={() => setSelectedType(type.name)}
                >
                  {getTypeIcon(type.name)}
                  <span>{type.name}</span>
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
                <h2>Rising this week</h2>
              </div>

              <span className="board-period">
                {marketplaceConfig.board.periodLabel}
              </span>
            </div>

            <div className="filters">
              <select defaultValue="">
                <option value="">All categories</option>
                {initialCategories
                  .filter((category) => category.enabled)
                  .map((category) => (
                    <option key={category.id}>{category.name}</option>
                  ))}
              </select>

              <select defaultValue="">
                <option value="">All subcategories</option>
              </select>

              <div className="search-field">
                <Search size={16} />
                <input
                  type="search"
                  placeholder="Search listings"
                  aria-label="Search listings"
                />
              </div>
            </div>

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

              <a href="#how">How it works →</a>
            </div>

            <div className="board-list">
  {listingsLoading ? (
    <div className="empty-board">Loading listings...</div>
  ) : listingsError ? (
    <div className="empty-board">{listingsError}</div>
  ) : visibleListings.length > 0 ? (
    visibleListings.map((listing, index) => {
      const typeName = getListingTypeName(listing.listingTypeId);
      const categoryName = getCategoryName(listing.categoryId);
      const subcategoryName = getSubcategoryName(
        listing.categoryId,
        listing.subcategoryId,
      );

      const rank = listing.currentBoardRank ?? index + 1;

      return (
        <article className="board-row" key={listing.id}>
          <div className="rank">
            {String(rank).padStart(2, "0")}
          </div>

          <div
            className={`listing-mark listing-mark-${typeName
              .toLowerCase()
              .replace(/\s+/g, "-")}`}
          >
            {listing.title.charAt(0)}
          </div>

          <div className="listing-content">
            <div className="listing-title-line">
              <h3>{listing.title}</h3>

              {rank === 1 && (
                <span className="rank-badge badge-top">
                  TOP
                </span>
              )}
            </div>

            <p className="listing-meta">
              {typeName}
              {" · "}
              {categoryName}

              {subcategoryName && (
                <>
                  {" · "}
                  {subcategoryName}
                </>
              )}

              {listing.handle && (
                <>
                  <span className="meta-separator"> · </span>
                  <strong>{listing.handle}</strong>
                </>
              )}

              {listing.ownerDisplayName && (
                <span className="meta-owner">
                  {" · "}
                  {listing.ownerDisplayName}
                </span>
              )}
            </p>

            <p className="listing-description">
              {listing.shortDescription}
            </p>
          </div>

          <div className="listing-score">
            <strong>
              {formatMoneyMinor(listing.currentBoostTotalMinor)}
            </strong>

            <span>
              <Users size={12} />
              0
            </span>
          </div>

          <div className="listing-actions">
            <a
              className="visit-button"
              href={listing.externalUrl}
              target="_blank"
              rel="noreferrer"
            >
              Visit ↗
            </a>

            <button className="push-button" type="button">
              <ArrowUp size={14} strokeWidth={2.5} />
              {marketplaceConfig.terminology.pushAction}
            </button>
          </div>
        </article>
      );
    })
  ) : (
    <div className="empty-board">
      No published listings in this type yet.
    </div>
  )}
</div>

            <div className="board-bottom">
              <span>Ranking is based on paid pushes this board period.</span>
              <button type="button">View all →</button>
            </div>

            <div className="mobile-side-content">
              <VisibilityCard />
              <NewTodayCard />
              <HowItWorksCard />
            </div>
          </section>

          <aside className="side-panel">

            <VisibilityCard />
            <NewTodayCard />
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
            <a href="#add-listing">Add listing</a>
            <a href="#pricing">Pricing</a>
            <a href="#how">How Push Up works</a>
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
          <span>© 2026 {siteConfig.name}</span>
          <span>Built for discovery.</span>
        </div>
      </footer>
    </>
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
        Put your channel, app, website or startup on the public board.
      </p>

      <button type="button">
        <ListPlus size={15} />
        Add your listing
      </button>
    </section>
  );
}

function NewTodayCard() {
  return (
    <section className="side-section new-today-card" id="new">
      <div className="side-title">
        <div className="side-card-heading">
          <span className="side-icon new-icon">
            <Sparkles size={17} />
          </span>

          <p className="eyebrow">NEW TODAY</p>
        </div>

        <span>{newToday.length} shown</span>
      </div>

      <div className="new-list">
        {newToday.map((item) => (
          <button type="button" key={item.name}>
            <strong>{item.name}</strong>
            <span>{item.type}</span>
          </button>
        ))}
      </div>

      <button className="text-action" type="button">
        View all new listings →
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
        push it higher on the board.
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
              Appear on the public board, search and category filters.
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