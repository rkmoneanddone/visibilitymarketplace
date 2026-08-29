import {
  siteConfig,
} from "../config/site";

import "./legal-pages.css";

export function ContactPage() {
  return (
    <main className="legal-page">
      <section className="legal-card">
        <p className="legal-kicker">
          CONTACT
        </p>

        <h1>
          Contact Us
        </h1>

        <p>
          For general questions about {siteConfig.name}, listings, Boards or the website, email us at:
        </p>

        <p className="legal-contact-email">
          <a
            href={`mailto:${siteConfig.supportEmail}`}
          >
            {siteConfig.supportEmail}
          </a>
        </p>
      </section>
    </main>
  );
}
