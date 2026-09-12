import {
  randomUUID,
} from "node:crypto";
import {
  connect,
  type TLSSocket,
} from "node:tls";

import {
  defineSecret,
} from "firebase-functions/params";

import {
  getRuntimeSystemConfig,
  type EmailTemplateConfig,
  type ViewBidSystemConfig,
} from "./systemConfig";

export const hostingerSmtpPassword =
  defineSecret("HOSTINGER_SMTP_PASSWORD");

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

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function dotStuff(value: string) {
  return value
    .replace(/\r?\n/g, "\r\n")
    .replace(/^\./gm, "..");
}

function buildMimeMessage(
  config: ViewBidSystemConfig,
  to: string,
  template: EmailTemplateConfig,
  variables: Record<string, string>,
) {
  const boundary =
    `viewbid_${randomUUID().replace(/-/g, "")}`;
  const messageId =
    `<${randomUUID()}@quickstories.in>`;

  const subject =
    render(template.subject, variables);
  const html =
    render(template.html, variables);
  const text =
    render(template.text, variables);

  const headers = [
    `From: ${encodeHeader(config.email.senderName)} <${config.email.fromEmail}>`,
    `To: <${to}>`,
    `Reply-To: <${config.email.replyToEmail}>`,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary=\"${boundary}\"`,
  ];

  const body = [
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    `--${boundary}--`,
    "",
  ];

  return {
    messageId,
    data:
      dotStuff(
        `${headers.join("\r\n")}\r\n\r\n${body.join("\r\n")}`,
      ),
  };
}

function createResponseReader(socket: TLSSocket) {
  let buffer = "";
  const waiters: Array<{
    resolve: (value: string) => void;
    reject: (error: Error) => void;
  }> = [];

  function flush() {
    while (waiters.length > 0) {
      const lines =
        buffer.split("\r\n");

      let endIndex = -1;
      for (let i = 0; i < lines.length - 1; i += 1) {
        if (/^\d{3} /.test(lines[i])) {
          endIndex = i;
          break;
        }
      }

      if (endIndex < 0) {
        return;
      }

      const response =
        lines.slice(0, endIndex + 1).join("\r\n");
      buffer =
        lines.slice(endIndex + 1).join("\r\n");

      waiters.shift()!.resolve(response);
    }
  }

  socket.on("data", (chunk) => {
    buffer += chunk.toString();
    flush();
  });

  socket.on("error", (error) => {
    while (waiters.length > 0) {
      waiters.shift()!.reject(error);
    }
  });

  return () =>
    new Promise<string>((resolve, reject) => {
      waiters.push({ resolve, reject });
      flush();
    });
}

function assertSmtpCode(
  response: string,
  allowed: number[],
) {
  const code = Number(response.slice(0, 3));

  if (!allowed.includes(code)) {
    throw new Error(
      `Hostinger SMTP rejected the request: ${response.slice(0, 500)}`,
    );
  }
}

async function sendWithHostingerSmtp(
  config: ViewBidSystemConfig,
  to: string,
  template: EmailTemplateConfig,
  variables: Record<string, string>,
): Promise<SendConfiguredEmailResult> {
  const password =
    hostingerSmtpPassword.value().trim();
  const username =
    config.email.fromEmail.trim().toLowerCase();

  if (!password) {
    return {
      sent: false,
      skippedReason:
        "HOSTINGER_SMTP_PASSWORD is not configured.",
    };
  }

  if (!validEmail(username)) {
    return {
      sent: false,
      skippedReason:
        "Configured From email is not valid for SMTP authentication.",
    };
  }

  const socket =
    connect({
      host: "smtp.hostinger.com",
      port: 465,
      servername: "smtp.hostinger.com",
      rejectUnauthorized: true,
    });

  socket.setTimeout(20000);

  await new Promise<void>((resolve, reject) => {
    socket.once("secureConnect", resolve);
    socket.once("error", reject);
    socket.once("timeout", () =>
      reject(new Error("Hostinger SMTP connection timed out.")),
    );
  });

  const readResponse =
    createResponseReader(socket);

  async function command(
    value: string,
    allowed: number[],
  ) {
    socket.write(`${value}\r\n`);
    const response =
      await readResponse();
    assertSmtpCode(response, allowed);
    return response;
  }

  try {
    assertSmtpCode(
      await readResponse(),
      [220],
    );

    await command(
      "EHLO visibilitymarketplace.web.app",
      [250],
    );
    await command("AUTH LOGIN", [334]);
    await command(
      Buffer.from(username).toString("base64"),
      [334],
    );
    await command(
      Buffer.from(password).toString("base64"),
      [235],
    );
    await command(
      `MAIL FROM:<${username}>`,
      [250],
    );
    await command(
      `RCPT TO:<${to}>`,
      [250, 251],
    );
    await command("DATA", [354]);

    const message =
      buildMimeMessage(
        config,
        to,
        template,
        variables,
      );

    socket.write(`${message.data}\r\n.\r\n`);
    assertSmtpCode(
      await readResponse(),
      [250],
    );

    socket.write("QUIT\r\n");

    return {
      sent: true,
      providerMessageId:
        message.messageId,
    };
  } finally {
    socket.end();
  }
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

  return sendWithHostingerSmtp(
    config,
    to,
    template,
    variables,
  );
}
