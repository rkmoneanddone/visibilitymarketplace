import type {
  ReactNode,
} from "react";

import {
  useAuth,
} from "../auth/AuthProvider";

import {
  useRuntimeConfig,
} from "./RuntimeConfigProvider";

import "./maintenance.css";

type Props = {
  children: ReactNode;
};

export function MaintenanceGuard({
  children,
}: Props) {
  const {
    profile,
    initializing,
  } = useAuth();

  const {
    config,
    loading,
  } = useRuntimeConfig();

  if (loading || initializing) {
    return (
      <main className="maintenance-page">
        <section className="maintenance-card">
          <p className="maintenance-kicker">
            ViewBid
          </p>
          <h1>Loading...</h1>
        </section>
      </main>
    );
  }

  const maintenanceEnabled =
    Boolean(
      config?.general.maintenanceMode,
    );

  const adminBypass =
    profile?.role === "admin";

  if (
    maintenanceEnabled &&
    !adminBypass
  ) {
    return (
      <main className="maintenance-page">
        <section className="maintenance-card">
          <p className="maintenance-kicker">
            {config?.general.brandName ||
              "ViewBid"}
          </p>

          <h1>
            Temporarily unavailable
          </h1>

          <p>
            {config?.general
              .maintenanceMessage ||
              "ViewBid is temporarily unavailable. Please try again shortly."}
          </p>

          {config?.general
            .supportEmail && (
            <a
              href={`mailto:${config.general.supportEmail}`}
            >
              {config.general.supportEmail}
            </a>
          )}
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
