import {
  ArrowUp,
  Eye,
  LayoutGrid,
  ListPlus,
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
    icon: <ListPlus size={18} />,
    number: "01",
    title: "List",
    text:
      "Add what people should discover: a channel, app, startup, website or other supported listing type.",
    className: "how-step-blue",
  },
  {
    icon: <Eye size={18} />,
    number: "02",
    title: "Get discovered",
    text:
      "Your published listing appears in the public marketplace and can be found through Listing Type and search.",
    className: "how-step-green",
  },
  {
    icon: <ArrowUp size={18} />,
    number: "03",
    title: "Push Up",
    text:
      "Owners and supporters can pay to move a listing higher. Paid Push Ups determine marketplace ranking.",
    className: "how-step-yellow",
  },
  {
    icon: <Trophy size={18} />,
    number: "04",
    title: "Weekly ranking",
    text:
      "The normal marketplace ranks listings within each ranking period. Historical periods stay separate.",
    className: "how-step-purple",
  },
  {
    icon: <LayoutGrid size={18} />,
    number: "05",
    title: "Boards",
    text:
      "Boards are focused, one-time competitions for one Listing Type. Eligible existing listings can enter during the entry window.",
    className: "how-step-blue",
  },
  {
    icon: <WalletCards size={18} />,
    number: "06",
    title: "Transparent ranking",
    text:
      "A Board entry fee only gives access to that Board. It does not increase rank. Board-specific Push Ups determine Board ranking.",
    className: "how-step-green",
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
          Discover. Support. Move it up.
        </h1>

        <p>
          {siteConfig.name} is a visibility marketplace. Listings compete for attention through transparent paid Push Ups, while focused Boards create separate, time-limited competitions.
        </p>

        <div className="how-hero-actions">
          <Link
            className="how-primary-link"
            to="/#board"
          >
            Explore listings
          </Link>

          <Link
            className="how-secondary-link"
            to="/boards"
          >
            View Boards
          </Link>
        </div>
      </section>

      <section
        className="how-grid"
        aria-label="How ViewBid works"
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
          Paid visibility is not organic popularity.
        </strong>

        <p>
          {siteConfig.name} clearly shows when ranking is based on paid Push Ups so visitors can understand what each position represents.
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