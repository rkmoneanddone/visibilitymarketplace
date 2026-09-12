import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getAdminSystemConfig,
  updateAdminSystemConfig,
  type EmailTemplateConfig,
  type ViewBidSystemConfig,
} from "../../services/admin/systemConfig";

type AdminConfigSection =
  | "payments"
  | "email"
  | "ranking"
  | "system";

type Props = {
  section: AdminConfigSection;
};

type TemplateKey =
  keyof ViewBidSystemConfig["email"]["templates"];

const templateLabels:
  Record<TemplateKey, string> = {
    paymentSuccess:
      "Payment success",
    paymentFailed:
      "Payment failed",
    paymentCancelled:
      "Payment cancelled",
    paymentRefunded:
      "Payment refunded",
    listingApproved:
      "Listing approved",
    listingRejected:
      "Listing rejected",
    boardApproved:
      "Board approved",
    boardRejected:
      "Board rejected",
    boardActivated:
      "Board activated",
    welcome:
      "Welcome",
  };

function numberValue(
  value: string,
  fallback: number,
) {
  const parsed = Number(value);

  return Number.isSafeInteger(parsed)
    ? parsed
    : fallback;
}

export function AdminSystemConfigPanel({
  section,
}: Props) {
  const [config, setConfig] =
    useState<ViewBidSystemConfig | null>(
      null,
    );

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [templateKey, setTemplateKey] =
    useState<TemplateKey>(
      "paymentSuccess",
    );

  useEffect(() => {
    let active = true;

    void getAdminSystemConfig()
      .then((value) => {
        if (active) {
          setConfig(value);
        }
      })
      .catch((error) => {
        console.error(
          "Unable to load system configuration:",
          error,
        );

        if (active) {
          setMessage(
            "Unable to load system configuration.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const template =
    useMemo(
      () =>
        config
          ? config.email.templates[
              templateKey
            ]
          : null,
      [config, templateKey],
    );

  async function save() {
    if (!config || saving) {
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const saved =
        await updateAdminSystemConfig(
          config,
        );

      setConfig(saved);
      setMessage(
        `Configuration saved. Active version: ${saved.version}.`,
      );
    } catch (error) {
      console.error(
        "Unable to save system configuration:",
        error,
      );

      setMessage(
        "Unable to save configuration. Check the values and admin access.",
      );
    } finally {
      setSaving(false);
    }
  }

  function updateTemplate(
    patch: Partial<EmailTemplateConfig>,
  ) {
    if (!config) {
      return;
    }

    setConfig({
      ...config,
      email: {
        ...config.email,
        templates: {
          ...config.email.templates,
          [templateKey]: {
            ...config.email.templates[
              templateKey
            ],
            ...patch,
          },
        },
      },
    });
  }

  if (!config) {
    return (
      <div className="admin-state">
        {message ||
          "Loading configuration..."}
      </div>
    );
  }

  return (
    <section className="admin-config-panel">
      <div className="admin-config-version">
        Active configuration version:
        {" "}
        <strong>
          {config.version}
        </strong>
      </div>

      {section === "payments" && (
        <div className="admin-config-grid">
          <label className="admin-config-toggle">
            <input
              type="checkbox"
              checked={
                config.payments.enabled
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  payments: {
                    ...config.payments,
                    enabled:
                      event.target.checked,
                  },
                })
              }
            />
            Payments enabled
          </label>

          <label>
            Payment provider
            <input
              value="Dodo"
              disabled
            />
          </label>

          <label>
            Environment
            <select
              value={
                config.payments.environment
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  payments: {
                    ...config.payments,
                    environment:
                      event.target.value ===
                      "live_mode"
                        ? "live_mode"
                        : "test_mode",
                  },
                })
              }
            >
              <option value="test_mode">
                Test mode
              </option>
              <option value="live_mode">
                Live mode
              </option>
            </select>
          </label>

          <label className="admin-config-wide">
            Dodo Product ID
            <input
              value={
                config.payments.dodoProductId
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  payments: {
                    ...config.payments,
                    dodoProductId:
                      event.target.value,
                  },
                })
              }
            />
          </label>

          <label className="admin-config-wide">
            Success message
            <textarea
              value={
                config.payments.successMessage
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  payments: {
                    ...config.payments,
                    successMessage:
                      event.target.value,
                  },
                })
              }
            />
          </label>

          <label className="admin-config-wide">
            Failure message
            <textarea
              value={
                config.payments.failureMessage
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  payments: {
                    ...config.payments,
                    failureMessage:
                      event.target.value,
                  },
                })
              }
            />
          </label>

          <label className="admin-config-wide">
            Cancellation message
            <textarea
              value={
                config.payments.cancelledMessage
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  payments: {
                    ...config.payments,
                    cancelledMessage:
                      event.target.value,
                  },
                })
              }
            />
          </label>

          <label className="admin-config-wide">
            Refund policy text
            <textarea
              value={
                config.payments.refundPolicyText
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  payments: {
                    ...config.payments,
                    refundPolicyText:
                      event.target.value,
                  },
                })
              }
            />
          </label>

          <div className="admin-config-secret-note admin-config-wide">
            Dodo API and webhook secrets are intentionally not editable here. They remain in Firebase Secret Manager.
          </div>
        </div>
      )}

      {section === "email" && (
        <div className="admin-config-grid">
          <label className="admin-config-toggle">
            <input
              type="checkbox"
              checked={
                config.email.enabled
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  email: {
                    ...config.email,
                    enabled:
                      event.target.checked,
                  },
                })
              }
            />
            Transactional email enabled
          </label>

          <label>
            Mail provider
            <select
              value={
                config.email.provider
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  email: {
                    ...config.email,
                    provider:
                      event.target.value ===
                      "resend"
                        ? "resend"
                        : "disabled",
                  },
                })
              }
            >
              <option value="disabled">
                Disabled
              </option>
              <option value="resend">
                Resend
              </option>
            </select>
          </label>

          <label>
            Sender name
            <input
              value={
                config.email.senderName
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  email: {
                    ...config.email,
                    senderName:
                      event.target.value,
                  },
                })
              }
            />
          </label>

          <label>
            From email
            <input
              type="email"
              value={
                config.email.fromEmail
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  email: {
                    ...config.email,
                    fromEmail:
                      event.target.value,
                  },
                })
              }
            />
          </label>

          <label>
            Reply-to email
            <input
              type="email"
              value={
                config.email.replyToEmail
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  email: {
                    ...config.email,
                    replyToEmail:
                      event.target.value,
                  },
                })
              }
            />
          </label>

          <label>
            Template
            <select
              value={templateKey}
              onChange={(event) =>
                setTemplateKey(
                  event.target.value as
                    TemplateKey,
                )
              }
            >
              {(
                Object.keys(
                  templateLabels,
                ) as TemplateKey[]
              ).map((key) => (
                <option
                  key={key}
                  value={key}
                >
                  {templateLabels[key]}
                </option>
              ))}
            </select>
          </label>

          {template && (
            <>
              <label className="admin-config-toggle admin-config-wide">
                <input
                  type="checkbox"
                  checked={
                    template.enabled
                  }
                  onChange={(event) =>
                    updateTemplate({
                      enabled:
                        event.target.checked,
                    })
                  }
                />
                Enable {templateLabels[
                  templateKey
                ]} email
              </label>

              <label className="admin-config-wide">
                Subject
                <input
                  value={template.subject}
                  onChange={(event) =>
                    updateTemplate({
                      subject:
                        event.target.value,
                    })
                  }
                />
              </label>

              <label className="admin-config-wide">
                HTML body
                <textarea
                  rows={8}
                  value={template.html}
                  onChange={(event) =>
                    updateTemplate({
                      html:
                        event.target.value,
                    })
                  }
                />
              </label>

              <label className="admin-config-wide">
                Plain-text body
                <textarea
                  rows={6}
                  value={template.text}
                  onChange={(event) =>
                    updateTemplate({
                      text:
                        event.target.value,
                    })
                  }
                />
              </label>
            </>
          )}

          <div className="admin-config-secret-note admin-config-wide">
            Mail API credentials are secrets and will never be stored in this configuration document.
          </div>
        </div>
      )}

      {section === "ranking" && (
        <div className="admin-config-grid">
          <label className="admin-config-toggle">
            <input
              type="checkbox"
              checked={
                config.ranking.publicWeeklyEnabled
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  ranking: {
                    ...config.ranking,
                    publicWeeklyEnabled:
                      event.target.checked,
                  },
                })
              }
            />
            Weekly Public ranking
          </label>

          <label className="admin-config-toggle">
            <input
              type="checkbox"
              checked={
                config.ranking.publicMonthlyEnabled
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  ranking: {
                    ...config.ranking,
                    publicMonthlyEnabled:
                      event.target.checked,
                  },
                })
              }
            />
            Monthly Public ranking
          </label>

          <label className="admin-config-toggle">
            <input
              type="checkbox"
              checked={
                config.ranking.boardRankingEnabled
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  ranking: {
                    ...config.ranking,
                    boardRankingEnabled:
                      event.target.checked,
                  },
                })
              }
            />
            Board ranking
          </label>

          <label className="admin-config-toggle">
            <input
              type="checkbox"
              checked={
                config.ranking.reverseBoostOnRefund
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  ranking: {
                    ...config.ranking,
                    reverseBoostOnRefund:
                      event.target.checked,
                  },
                })
              }
            />
            Reverse paid boost on verified refund
          </label>

          <label>
            Tie-break rule
            <select
              value={
                config.ranking.tieBreakRule
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  ranking: {
                    ...config.ranking,
                    tieBreakRule:
                      event.target.value ===
                      "newest_published"
                        ? "newest_published"
                        : "earliest_reached_total",
                  },
                })
              }
            >
              <option value="earliest_reached_total">
                Earliest to reach total
              </option>
              <option value="newest_published">
                Newest published
              </option>
            </select>
          </label>
        </div>
      )}

      {section === "system" && (
        <div className="admin-config-grid">
          <label>
            Brand name
            <input
              value={
                config.general.brandName
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  general: {
                    ...config.general,
                    brandName:
                      event.target.value,
                  },
                })
              }
            />
          </label>

          <label className="admin-config-wide">
            Public URL
            <input
              value={
                config.general.publicUrl
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  general: {
                    ...config.general,
                    publicUrl:
                      event.target.value,
                  },
                })
              }
            />
          </label>

          <label>
            Support email
            <input
              type="email"
              value={
                config.general.supportEmail
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  general: {
                    ...config.general,
                    supportEmail:
                      event.target.value,
                  },
                })
              }
            />
          </label>

          <label>
            Legal email
            <input
              type="email"
              value={
                config.general.legalEmail
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  general: {
                    ...config.general,
                    legalEmail:
                      event.target.value,
                  },
                })
              }
            />
          </label>

          <label className="admin-config-toggle admin-config-wide">
            <input
              type="checkbox"
              checked={
                config.general.maintenanceMode
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  general: {
                    ...config.general,
                    maintenanceMode:
                      event.target.checked,
                  },
                })
              }
            />
            Maintenance mode
          </label>

          <label className="admin-config-wide">
            Maintenance message
            <textarea
              value={
                config.general.maintenanceMessage
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  general: {
                    ...config.general,
                    maintenanceMessage:
                      event.target.value,
                  },
                })
              }
            />
          </label>

          <label>
            Public page size
            <input
              type="number"
              min="5"
              max="100"
              value={
                config.limits.publicPageSize
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  limits: {
                    ...config.limits,
                    publicPageSize:
                      numberValue(
                        event.target.value,
                        config.limits.publicPageSize,
                      ),
                  },
                })
              }
            />
          </label>

          <label>
            Board page size
            <input
              type="number"
              min="5"
              max="100"
              value={
                config.limits.boardPageSize
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  limits: {
                    ...config.limits,
                    boardPageSize:
                      numberValue(
                        event.target.value,
                        config.limits.boardPageSize,
                      ),
                  },
                })
              }
            />
          </label>

          <label>
            Dashboard page size
            <input
              type="number"
              min="5"
              max="100"
              value={
                config.limits.dashboardPageSize
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  limits: {
                    ...config.limits,
                    dashboardPageSize:
                      numberValue(
                        event.target.value,
                        config.limits.dashboardPageSize,
                      ),
                  },
                })
              }
            />
          </label>

          <label>
            Search result limit
            <input
              type="number"
              min="5"
              max="100"
              value={
                config.limits.searchResultLimit
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  limits: {
                    ...config.limits,
                    searchResultLimit:
                      numberValue(
                        event.target.value,
                        config.limits.searchResultLimit,
                      ),
                  },
                })
              }
            />
          </label>

          <label>
            Server config cache (seconds)
            <input
              type="number"
              min="30"
              max="3600"
              value={
                config.limits.configCacheSeconds
              }
              onChange={(event) =>
                setConfig({
                  ...config,
                  limits: {
                    ...config.limits,
                    configCacheSeconds:
                      numberValue(
                        event.target.value,
                        config.limits.configCacheSeconds,
                      ),
                  },
                })
              }
            />
          </label>
        </div>
      )}

      <button
        type="button"
        className="admin-publish-button"
        disabled={saving}
        onClick={() =>
          void save()
        }
      >
        {saving
          ? "Saving..."
          : "Save Configuration"}
      </button>

      {message && (
        <p className="admin-pricing-message">
          {message}
        </p>
      )}
    </section>
  );
}
