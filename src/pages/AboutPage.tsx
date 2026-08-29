import {
  siteConfig,
} from "../config/site";

import "./legal-pages.css";

export function AboutPage() {
  return (
    <main className="legal-page">
      <section className="legal-card">
        <p className="legal-kicker">
          ABOUT US
        </p>

        <h1>
          About {siteConfig.name}
        </h1>

        <p>
          {siteConfig.name} is a simple discovery and visibility marketplace for public listings and time-limited Boards.
        </p>

        <h2>
          About the builder
        </h2>

        <p>
          {siteConfig.builder.name} is an independent product builder working on practical web products and software tools.
        </p>

        <h2>
          Other projects
        </h2>

        <div className="legal-project-list">
          <a
            href={
              siteConfig.projects
                .parentsBoard.url
            }
            target="_blank"
            rel="noreferrer"
          >
            <strong>
              {
                siteConfig.projects
                  .parentsBoard.name
              }
            </strong>

            <span>
              {
                siteConfig.projects
                  .parentsBoard
                  .description
              }
            </span>
          </a>

          <a
            href={
              siteConfig.projects
                .quickStories.url
            }
            target="_blank"
            rel="noreferrer"
          >
            <strong>
              {
                siteConfig.projects
                  .quickStories.name
              }
            </strong>

            <span>
              {
                siteConfig.projects
                  .quickStories
                  .description
              }
            </span>
          </a>
        </div>

        <h2>
          Contact
        </h2>

        <p>
          For general questions, write to{" "}
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
