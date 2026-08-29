import {
  siteConfig,
} from "../config/site";

import "./legal-pages.css";

export function PrivacyPage() {
  return (
    <main className="legal-page">
      <section className="legal-card">
        <p className="legal-kicker">
          PRIVACY
        </p>

        <h1>
          Privacy Policy
        </h1>

        <p>
          {siteConfig.name} uses information that users provide and basic service information needed to operate accounts, listings, Boards, payments, security and site functionality.
        </p>

        <h2>
          Public information
        </h2>

        <p>
          Information submitted for a public listing or Board may be visible to other visitors. This can include listing titles, handles, links and ranking-related information.
        </p>

        <h2>
          Service providers
        </h2>

        <p>
          The service may use third-party providers for hosting, authentication, analytics and payment processing where needed to operate the platform.
        </p>

        <h2>
          Contact
        </h2>

        <p>
          Privacy questions can be sent to{" "}
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
