declare global {
  interface Window {
    gtag?: (
      command: string,
      eventName: string,
      params?: Record<string, unknown>,
    ) => void;
  }
}

export function recordPageView(
  path: string,
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.gtag?.(
    "event",
    "page_view",
    {
      page_path:
        path,
      page_location:
        window.location.href,
    },
  );
}

/*
 * Public total page-view count must come from a real
 * analytics aggregate or backend source.
 */
export async function getPublicPageViewCount():
  Promise<number | null> {
  return null;
}
