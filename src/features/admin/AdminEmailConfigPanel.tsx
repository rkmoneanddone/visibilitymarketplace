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

type TemplateKey =
  keyof ViewBidSystemConfig["email"]["templates"];

const templateLabels:
  Record<TemplateKey, string> = {
    paymentSuccess: "Payment success",
    paymentFailed: "Payment failed",
    paymentCancelled: "Payment cancelled",
    paymentRefunded: "Payment refunded",
    listingApproved: "Listing approved",
    listingRejected: "Listing rejected",
    boardApproved: "Board approved",
    boardRejected: "Board rejected",
    boardActivated: "Board activated",
    welcome: "Welcome",
  };

export function AdminEmailConfigPanel() {
  const [config, setConfig] =
    useState<ViewBidSystemConfig | null>(null);
  const [saving, setSaving] =
    useState(false);
  const [message, setMessage] =
    useState<string | null>(null);
  const [templateKey, setTemplateKey] =
    useState<TemplateKey>("paymentSuccess");

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
          "Unable to load email configuration:",
          error,
        );
        if (active) {
          setMessage(
            "Unable to load email configuration.",
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
          ? config.email.templates[templateKey]
          : null,
      [config, templateKey],
    );

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
            ...config.email.templates[templateKey],
            ...patch,
          },
        },
      },
    });
  }

  async function save() {
    if (!config || saving) {
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const saved =
        await updateAdminSystemConfig(config);

      setConfig(saved);
      setMessage(
        `Email configuration saved. Active version: ${saved.version}.`,
      );
    } catch (error) {
      console.error(
        "Unable to save email configuration:",
        error,
      );
      setMessage(
        "Unable to save email configuration.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!config) {
    return (
      <div className="admin-state">
        {message || "Loading email configuration..."}
      </div>
    );
  }

  return (
    <section className="admin-config-panel">
      <div className="admin-config-version">
        Active configuration version:{" "}
        <strong>{config.version}</strong>
      </div>

      <div className="admin-config-grid">
        <label className="admin-config-toggle">
          <input
            type="checkbox"
            checked={config.email.enabled}
            onChange={(event) =>
              setConfig({
                ...config,
                email: {
                  ...config.email,
                  enabled: event.target.checked,
                  provider:
                    event.target.checked
                      ? "resend"
                      : "disabled",
                },
              })
            }
          />
          Transactional email enabled
        </label>

        <label>
          Mail transport
          <input
            value="Hostinger SMTP (SSL 465)"
            disabled
          />
        </label>

        <label>
          Sender name
          <input
            value={config.email.senderName}
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
          From / SMTP username
          <input
            type="email"
            value={config.email.fromEmail}
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
            value={config.email.replyToEmail}
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
                event.target.value as TemplateKey,
              )
            }
          >
            {(
              Object.keys(templateLabels) as
                TemplateKey[]
            ).map((key) => (
              <option key={key} value={key}>
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
                checked={template.enabled}
                onChange={(event) =>
                  updateTemplate({
                    enabled: event.target.checked,
                  })
                }
              />
              Enable {templateLabels[templateKey]} email
            </label>

            <label className="admin-config-wide">
              Subject
              <input
                value={template.subject}
                onChange={(event) =>
                  updateTemplate({
                    subject: event.target.value,
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
                    html: event.target.value,
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
                    text: event.target.value,
                  })
                }
              />
            </label>
          </>
        )}

        <div className="admin-config-secret-note admin-config-wide">
          SMTP host is smtp.hostinger.com on SSL port 465. The mailbox password is stored only in Firebase Secret Manager as HOSTINGER_SMTP_PASSWORD and is never exposed here.
        </div>

        <button
          type="button"
          className="admin-publish-button"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving
            ? "Saving..."
            : "Save Email Settings"}
        </button>

        {message && (
          <p className="admin-pricing-message admin-config-wide">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
