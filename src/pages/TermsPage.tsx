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
          Only verified Push Up payments affect visibility ranking. Public and Board rankings are separate. Listing submission fees, Board activation fees and Board entry fees do not improve ranking.
        </p>

        <h2>
          Payments
        </h2>

        <p>
          Listing submission fees may be free or paid depending on current platform configuration and pay for submission and review processing; payment does not guarantee approval. Board activation and Board entry fees pay for the applicable platform service and do not improve ranking. Displayed prices may change for new transactions when platform pricing is updated. Once a paid Listing submission is prepared, its fee is snapshotted for that transaction. Successfully processed payments are generally non-refundable once the relevant service or processing has begun, except where applicable law requires otherwise or where a platform payment error occurred.
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
