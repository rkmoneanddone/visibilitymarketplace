import {
  ArrowUp,
  LayoutGrid,
  ListPlus,
  Search,
  ShieldCheck,
  Trophy,
  WalletCards,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import {
  siteConfig,
} from "../config/site";

import "./how-it-works.css";

const steps = [
  {
    icon:
      <ListPlus size={18} />,
    number:
      "01",
    title:
      "Add a Public Listing",
    text:
      "Sign in and submit what you want people to discover. Choose the correct Listing Type, add the title, handle, destination link and other required details. Public Listings belong to the normal marketplace, not to a Board.",
    className:
      "how-step-blue",
  },
  {
    icon:
      <ShieldCheck size={18} />,
    number:
      "02",
    title:
      "Review and publish",
    text:
      "A submitted listing must be published before it appears publicly. Once published, it becomes eligible for the Public Leaderboard, Listing Type filters, title and handle search, visits and Public Push Ups.",
    className:
      "how-step-green",
  },
  {
    icon:
      <Search size={18} />,
    number:
      "03",
    title:
      "People discover it",
    text:
      "Visitors can browse the Public Leaderboard, switch Listing Types and search by title or @handle. The marketplace loads listings in batches so people can keep exploring with Load More without loading the entire marketplace at once.",
    className:
      "how-step-yellow",
  },
  {
    icon:
      <ArrowUp size={18} />,
    number:
      "04",
    title:
      "Public Push Up changes Public rank",
    text:
      "Owners and supporters can pay to Push Up a published Public Listing. Verified Public Push Ups determine its position for the selected ranking period, such as This week or This month. A Public Push does not change any Board ranking.",
    className:
      "how-step-purple",
  },
  {
    icon:
      <LayoutGrid size={18} />,
    number:
      "05",
    title:
      "Boards are separate competitions",
    text:
      "A Board is a one-time, time-limited competition for one Listing Type. It has its own entry window, end date, entry fee and minimum Board Push amount. When that Board ends, it closes permanently; a new competition requires a new Board.",
    className:
      "how-step-blue",
  },
  {
    icon:
      <WalletCards size={18} />,
    number:
      "06",
    title:
      "Enter a Board",
    text:
      "Sign in, open an eligible Board and submit the Board listing. If review is required, the listing is approved first and the Board entry payment becomes available afterward. Paying the entry fee activates participation only; it gives zero ranking advantage.",
    className:
      "how-step-green",
  },
  {
    icon:
      <ArrowUp size={18} />,
    number:
      "07",
    title:
      "Board Push Up decides Board rank",
    text:
      "Once entered, that listing competes only with the other listings inside the same Board. Owners and supporters can Push Up a Board entry using that Board's configured minimum amount. Only Board-specific Push Ups determine the Board ranking.",
    className:
      "how-step-yellow",
  },
  {
    icon:
      <Trophy size={18} />,
    number:
      "08",
    title:
      "Board closes with a final ranking",
    text:
      "When the Board end time is reached, new entries and Board Push Ups stop. The Board remains viewable as a completed competition with its final ranking, while the normal Public Marketplace continues independently.",
    className:
      "how-step-purple",
  },
];

export function HowItWorksPage() {
  return (
    <main className="how-page">
      <section className="how-hero">
        <p className="how-kicker">
          HOW {siteConfig.name.toUpperCase()} WORKS
        </p>

        <h1>
          Two ways to compete for visibility.
        </h1>

        <p>
          {siteConfig.name} has two separate ranking systems. Public Listings compete continuously in the Public Marketplace, while Boards are focused, time-limited competitions with their own entries and Push Ups. Ranking changes only through verified Push Up payments for the place where that Push was made.
        </p>

        <div className="how-hero-actions">
          <Link
            className="how-primary-link"
            to="/#board"
          >
            Explore Public Listings
          </Link>

          <Link
            className="how-secondary-link"
            to="/boards"
          >
            Explore Boards
          </Link>
        </div>
      </section>

      <section
        className="how-grid"
        aria-label="How Visibility Marketplace works"
      >
        {steps.map(
          (step) => (
            <article
              className={`how-step ${step.className}`}
              key={step.number}
            >
              <div className="how-step-top">
                <span className="how-step-icon">
                  {step.icon}
                </span>

                <span className="how-step-number">
                  {step.number}
                </span>
              </div>

              <h2>
                {step.title}
              </h2>

              <p>
                {step.text}
              </p>
            </article>
          ),
        )}
      </section>

      <section className="how-note">
        <strong>
          Public ranking and Board ranking are independent.
        </strong>

        <p>
          A Public Push Up affects only the Public Marketplace ranking. A Board Push Up affects only that listing inside that specific Board. A Board entry fee never counts as a Push Up and never improves rank.
        </p>
      </section>

      <section className="how-note">
        <strong>
          You do not need to own a listing to support it.
        </strong>

        <p>
          Visitors and supporters can Push Up listings they want to support. Listing owners can also Push Up their own listings. Verified paid Push Ups are reflected in the appropriate ranking.
        </p>
      </section>

      <section className="how-note">
        <strong>
          Search is designed to stay efficient.
        </strong>

        <p>
          Public Listings, Boards and listings inside a Board are searched in their own context. Already loaded results are checked first; broader database search is used only when needed, helping keep unnecessary database reads low.
        </p>
      </section>

      <section className="how-refund-note">
        <strong>
          Payments are non-refundable after successful processing.
        </strong>

        <p>
          Listing visibility, Board entry and Push Up payments are not refunded once successfully processed because service effort, payment processing and infrastructure costs are incurred. This does not limit any refund right required by applicable law.
        </p>
      </section>
    </main>
  );
}
