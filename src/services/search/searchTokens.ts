export function normalizeSearchValue(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/@/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSearchTokens(
  ...values: Array<
    string | undefined | null
  >
): string[] {
  const result =
    new Set<string>();

  for (const value of values) {
    const normalized =
      normalizeSearchValue(
        value ?? "",
      );

    if (!normalized) {
      continue;
    }

    for (
      const word
      of normalized.split(" ")
    ) {
      const numericOnly =
        /^\d+$/.test(
          word,
        );

      if (
        word.length < 2 &&
        !numericOnly
      ) {
        continue;
      }

      const maxPrefix =
        Math.min(
          word.length,
          32,
        );

      const startSize =
        numericOnly
          ? 1
          : 2;

      for (
        let size = startSize;
        size <= maxPrefix;
        size += 1
      ) {
        result.add(
          word.slice(0, size),
        );

        if (
          result.size >= 120
        ) {
          return Array.from(
            result,
          );
        }
      }
    }
  }

  return Array.from(
    result,
  );
}

export function getSearchQueryTokens(
  value: string,
): string[] {
  return normalizeSearchValue(
    value,
  )
    .split(" ")
    .filter(
      (word) =>
        word.length >= 2 ||
        /^\d+$/.test(
          word,
        ),
    );
}

export function getPrimarySearchToken(
  value: string,
): string {
  const tokens =
    getSearchQueryTokens(
      value,
    );

  const numericToken =
    [...tokens]
      .reverse()
      .find(
        (token) =>
          /^\d+$/.test(
            token,
          ),
      );

  if (numericToken) {
    return numericToken;
  }

  return (
    [...tokens]
      .sort(
        (a, b) =>
          b.length -
          a.length,
      )[0] ??
    ""
  );
}

export function matchesSearch(
  query: string,
  ...values: Array<
    string | undefined | null
  >
): boolean {
  const queryTokens =
    getSearchQueryTokens(
      query,
    );

  if (queryTokens.length === 0) {
    return false;
  }

  const haystack =
    normalizeSearchValue(
      values
        .filter(Boolean)
        .join(" "),
    );

  return queryTokens.every(
    (token) =>
      haystack.includes(
        token,
      ),
  );
}
