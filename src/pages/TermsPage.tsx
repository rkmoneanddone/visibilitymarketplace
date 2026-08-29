import {
  siteConfig,
} from "../config/site";

import "./legal-pages.css";

export function TermsPage() {
  return (
    <main className="legal-page">
      <section className="legal-card">
        <p className="legal-kicker">
          TERMS
        </p>

        <h1>
          Terms & Conditions
        </h1>

        <p>
          By using {siteConfig.name}, users agree to use the service lawfully and to provide information they are permitted to submit.
        </p>

        <h2>
          Listings and Boards
        </h2>

        <p>
          Listings and Board entries may be reviewed, limited or removed when necessary for platform operation, safety, applicable rules or legal requirements.
        </p>

        <h2>
          Ranking and paid visibility
        </h2>

        <p>
          Paid Push Ups affect visibility ranking only in the place where the Push Up is made. Public and Board rankings are separate. A Board entry fee does not improve Board rank.
        </p>

        <h2>
          Payments
        </h2>

        <p>
          Successfully processed visibility, Board entry and Push Up payments are generally non-refundable because service, payment processing and infrastructure costs may already have been incurred, except where applicable law requires otherwise.
        </p>

        <h2>
          No guaranteed outcome
        </h2>

        <p>
          The service does not guarantee clicks, traffic, sales, followers, downloads, ranking duration or any other result from a listing, Board entry or Push Up.
        </p>

        <h2>
          Contact
        </h2>

        <p>
          General questions can be sent to{" "}
          <a
            href={`mailto:${siteConfig.supportEmail}`}
          >
            {siteConfig.supportEmail}
          </a>.
        </p>
      </section>
    </main>
  );
}
