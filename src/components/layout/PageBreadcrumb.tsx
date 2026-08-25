import {
  Link,
  useLocation,
} from "react-router-dom";

import "./page-breadcrumb.css";

const routeLabels: Record<
  string,
  string
> = {
  dashboard: "My listings",
  boards: "Boards",
  admin: "Admin",
  moderation: "Moderation",
};

export function PageBreadcrumb() {
  const location =
    useLocation();

  const segments =
    location.pathname
      .split("/")
      .filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  return (
    <nav
      className="page-breadcrumb"
      aria-label="Breadcrumb"
    >
      <div className="page-breadcrumb-path">
        <span className="page-breadcrumb-item">
          <Link to="/">
            Home
          </Link>
        </span>

        {segments.map(
          (segment, index) => {
            const path =
              "/" +
              segments
                .slice(
                  0,
                  index + 1,
                )
                .join("/");

            const label =
              routeLabels[segment] ??
              segment
                .replace(/-/g, " ")
                .replace(
                  /\b\w/g,
                  (value) =>
                    value.toUpperCase(),
                );

            const isLast =
              index ===
              segments.length - 1;

            return (
              <span
                className="page-breadcrumb-item"
                key={path}
              >
                <span className="page-breadcrumb-separator">
                  ›
                </span>

                {isLast ||
                path === "/admin" ? (
                  <span className="page-breadcrumb-current">
                    {label}
                  </span>
                ) : (
                  <Link to={path}>
                    {label}
                  </Link>
                )}
              </span>
            );
          },
        )}
      </div>
    </nav>
  );
}