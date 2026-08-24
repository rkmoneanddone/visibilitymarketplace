export type SocialPlatformKey =
  | "youtube"
  | "instagram"
  | "facebook"
  | "x";

export interface ResolvedPlatformIdentity {
  platformKey: SocialPlatformKey;
  handle: string;
  url: string;
}

function cleanHandle(
  value: string,
): string {
  return value
    .trim()
    .replace(/^@/, "")
    .replace(/\/+$/, "");
}

function looksLikeUrl(
  value: string,
): boolean {
  const lower =
    value.trim().toLowerCase();

  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("www.") ||
    lower.includes(".com/") ||
    lower.includes(".co/")
  );
}

function extractHandle(
  value: string,
): string {
  const raw = value.trim();

  if (!raw) {
    return "";
  }

  // Plain:
  // rohit
  // @rohit
  if (!looksLikeUrl(raw)) {
    return cleanHandle(raw);
  }

  try {
    const normalized =
      raw.startsWith("http://") ||
      raw.startsWith("https://")
        ? raw
        : `https://${raw}`;

    const url =
      new URL(normalized);

    const parts =
      url.pathname
        .split("/")
        .filter(Boolean);

    if (parts.length === 0) {
      return "";
    }

    return cleanHandle(
      parts[parts.length - 1],
    );
  } catch {
    return "";
  }
}

export function resolvePlatformIdentity(
  platformKey: SocialPlatformKey,
  input: string,
): ResolvedPlatformIdentity | null {
  const handle =
    extractHandle(input);

  if (!handle) {
    return null;
  }

  switch (platformKey) {
    case "youtube":
      return {
        platformKey,
        handle,
        url:
          `https://www.youtube.com/@${handle}`,
      };

    case "instagram":
      return {
        platformKey,
        handle,
        url:
          `https://www.instagram.com/${handle}/`,
      };

    case "facebook":
      return {
        platformKey,
        handle,
        url:
          `https://www.facebook.com/${handle}`,
      };

    case "x":
      return {
        platformKey,
        handle,
        url:
          `https://x.com/${handle}`,
      };
  }
}

export function requiresPlatformHandle(
  listingTypeId: string,
  targetKind: string,
): boolean {
  if (
    listingTypeId === "youtube" &&
    targetKind === "channel"
  ) {
    return true;
  }

  return (
    targetKind === "profile" &&
    [
      "instagram",
      "facebook",
      "x",
    ].includes(listingTypeId)
  );
}