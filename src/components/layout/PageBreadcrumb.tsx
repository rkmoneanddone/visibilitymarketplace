import {
  Link,
} from "react-router-dom";

import "./page-breadcrumb.css";

type BreadcrumbItem = {
  label: string;
  to?: string;
};

type PageBreadcrumbProps = {
  items: BreadcrumbItem[];
};

export function PageBreadcrumb({
  items,
}: PageBreadcrumbProps) {
  return (
    <nav
      className="page-breadcrumb"
      aria-label="Breadcrumb"
    >
      {items.map(
        (item, index) => (
          <span
            className="page-breadcrumb-item"
            key={`${item.label}-${index}`}
          >
            {index > 0 && (
              <span className="page-breadcrumb-separator">
                ›
              </span>
            )}

            {item.to ? (
              <Link to={item.to}>
                {item.label}
              </Link>
            ) : (
              <span className="page-breadcrumb-current">
                {item.label}
              </span>
            )}
          </span>
        ),
      )}
    </nav>
  );
}