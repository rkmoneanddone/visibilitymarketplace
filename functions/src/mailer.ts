import {
  defineSecret,
} from "firebase-functions/params";

import {
  getRuntimeSystemConfig,
  type EmailTemplateConfig,
  type ViewBidSystemConfig,
} from "./systemConfig";

export const resendApiKey =
  defineSecret("RESEND_API_KEY");

export type EmailTemplateKey =
  keyof ViewBidSystemConfig["email"]["templates"];

type SendConfiguredEmailInput = {
  to: string | null | undefined;
  templateKey: EmailTemplateKey;
  variables?: Record<string, string | number | null | undefined>;
};

type SendConfiguredEmailResult = {
  sent: boolean;
  skippedReason?: string;
  providerMessageId?: string;
};

function validEmail(
  value: string,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

function render(
  value: string,
  variables: Record<string, string>,
) {
  return value.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_match, key: string) =>
      variables[key] ?? "",
  );
}

function buildVariables(
  config: ViewBidSystemConfig,
  values: SendConfiguredEmailInput["variables"],
) {
  const variables:
    Record<string, string> = {
      brandName:
        config.general.brandName,
      supportEmail:
        config.general.supportEmail,
      publicUrl:
        config.general.publicUrl,
    };

  for (const [key, value] of
    Object.entries(values ?? {})) {
    variables[key] =
      value == null
        ? ""
        : String(value);
  }

  return variables;
}

async function sendWithResend(
  config: ViewBidSystemConfig,
  to: string,
  template: EmailTemplateConfig,
  variables: Record<string, string>,
): Promise<SendConfiguredEmailResult> {
  const apiKey =
    resendApiKey.value().trim();

  if (!apiKey) {
    return {
      sent: false,
      skippedReason:
        "RESEND_API_KEY is not configured.",
    };
  }

  const response =
    await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          from:
            `${config.email.senderName} <${config.email.fromEmail}>`,
          to: [to],
          reply_to:
            config.email.replyToEmail,
          subject:
            render(
              template.subject,
              variables,
            ),
          html:
            render(
              template.html,
              variables,
            ),
          text:
            render(
              template.text,
              variables,
            ),
        }),
      },
    );

  const raw =
    await response.text();

  let body: {
    id?: unknown;
    message?: unknown;
  } = {};

  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    body = {};
  }

  if (!response.ok) {
    throw new Error(
      `Resend email failed (${response.status}): ${String(
        body.message || raw || "Unknown error",
      ).slice(0, 500)}`,
    );
  }

  return {
    sent: true,
    providerMessageId:
      String(body.id ?? "").trim() ||
      undefined,
  };
}

export async function sendConfiguredEmail(
  input: SendConfiguredEmailInput,
): Promise<SendConfiguredEmailResult> {
  const to =
    String(input.to ?? "")
      .trim()
      .toLowerCase();

  if (!to || !validEmail(to)) {
    return {
      sent: false,
      skippedReason:
        "No valid recipient email.",
    };
  }

  const config =
    await getRuntimeSystemConfig();

  if (!config.email.enabled) {
    return {
      sent: false,
      skippedReason:
        "Email is disabled by system configuration.",
    };
  }

  const template =
    config.email.templates[
      input.templateKey
    ];

  if (!template.enabled) {
    return {
      sent: false,
      skippedReason:
        `Template ${input.templateKey} is disabled.`,
    };
  }

  if (
    config.email.provider ===
    "disabled"
  ) {
    return {
      sent: false,
      skippedReason:
        "Mail provider is disabled.",
    };
  }

  const variables =
    buildVariables(
      config,
      input.variables,
    );

  if (
    config.email.provider ===
    "resend"
  ) {
    return sendWithResend(
      config,
      to,
      template,
      variables,
    );
  }

  return {
    sent: false,
    skippedReason:
      "Unsupported mail provider.",
  };
}
