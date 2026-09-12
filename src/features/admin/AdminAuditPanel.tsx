import {
  useEffect,
  useState,
} from "react";

import {
  History,
} from "lucide-react";

import {
  getAdminAuditHistory,
  type AdminAuditItem,
} from "../../services/admin/auditHistory";

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString();
}

function entityText(item: AdminAuditItem) {
  if (item.paymentIntentId) {
    return `Payment ${item.paymentIntentId}`;
  }

  if (item.boardEntryId) {
    return `Board Entry ${item.boardEntryId}`;
  }

  if (item.boardId) {
    return `Board ${item.boardId}`;
  }

  if (item.listingId) {
    return `Listing ${item.listingId}`;
  }

  return "System";
}

export function AdminAuditPanel() {
  const [items, setItems] =
    useState<AdminAuditItem[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getAdminAuditHistory()
      .then((result) => {
        if (active) {
          setItems(result);
        }
      })
      .catch((loadError) => {
        console.error(
          "Unable to load Admin audit history:",
          loadError,
        );
        if (active) {
          setError(
            "Unable to load audit history.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="admin-config-panel">
      <div className="admin-config-version">
        <History size={14} />
        Recent audit history
      </div>

      {loading ? (
        <div className="admin-state">
          Loading audit history...
        </div>
      ) : error ? (
        <div className="admin-state">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="admin-state">
          No audit events yet.
        </div>
      ) : (
        <div className="admin-audit-list">
          {items.map((item) => (
            <article
              className="admin-audit-row"
              key={item.id}
            >
              <div>
                <strong>{item.type}</strong>
                <span>{entityText(item)}</span>
              </div>
              <div>
                <strong>
                  {item.actorType ||
                    (item.actorUserId
                      ? "user"
                      : "system")}
                </strong>
                <span>
                  {item.actorUserId || "system"}
                </span>
              </div>
              <div>
                <strong>{formatDate(item.createdAt)}</strong>
                <span>{item.id}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
