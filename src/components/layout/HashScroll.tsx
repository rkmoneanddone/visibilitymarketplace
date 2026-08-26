import {
  useEffect,
} from "react";

import {
  useLocation,
} from "react-router-dom";

export function HashScroll() {
  const location =
    useLocation();

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const targetId =
      location.hash.slice(1);

    const timer =
      window.setTimeout(
        () => {
          const target =
            document.getElementById(
              targetId,
            );

          target?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        },
        60,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [
    location.pathname,
    location.hash,
  ]);

  return null;
}