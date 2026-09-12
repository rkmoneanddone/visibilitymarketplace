import {
  siteConfig,
} from "../config/site";

import {
  useRuntimeConfig,
} from "../features/config/RuntimeConfigProvider";

import "./legal-pages.css";

export function ContactPage() {
  const {
    config,
  } = useRuntimeConfig();

  const brandName =
    config?.general.brandName ??
    siteConfig.name;

  const supportEmail =
    config?.general.supportEmail ??
    siteConfig.supportEmail;

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
          For general questions about {brandName}, listings, Boards or the website, email us at:
        </p>

        <p className="legal-contact-email">
          <a
            href={`mailto:${supportEmail}`}
          >
            {supportEmail}
          </a>
        </p>
      </section>
    </main>
  );
}
