export function formatPlatformHandle(
  handle?: string,
): string {
  if (!handle) {
    return "";
  }

  return `@${handle.replace(/^@/, "")}`;
}