import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import {
  db,
} from "../../data/database/client";

import type {
  Listing,
} from "../../types/marketplace";

import {
  getPrimarySearchToken,
  matchesSearch,
} from "../search/searchTokens";

import {
  getPublicRuntimeConfig,
} from "../config/runtimeConfig";

export type PublicRankingPeriod =
  | "this-week"
  | "this-month";

type TieBreakRule =
  | "earliest_reached_total"
  | "newest_published";

type PublicCursorDocument =
  QueryDocumentSnapshot<DocumentData>;

export type PublicListingCursor =
  | {
      phase:
        | "ranked"
        | "fallback"
        | "unranked";

      rankedCursor:
        PublicCursorDocument | null;

      fallbackCursor:
        PublicCursorDocument | null;
    }
  | null;

export type PublicListingPageResult = {
  items: Listing[];
  cursor: PublicListingCursor;
  hasMore: boolean;
};

type PeriodFields = {
  keyField:
    | "weeklyBoostKey"
    | "monthlyBoostKey";

  keyValue:
    string;

  totalField:
    | "weeklyBoostTotalMinor"
    | "monthlyBoostTotalMinor";
};

function currentUtcMonthKey(): string {
  const now =
    new Date();

  return [
    now.getUTCFullYear(),
    String(
      now.getUTCMonth() + 1,
    ).padStart(
      2,
      "0",
    ),
  ].join("-");
}

function currentUtcWeekKey(): string {
  const now =
    new Date();

  const day =
    now.getUTCDay();

  const daysFromMonday =
    day === 0
      ? 6
      : day - 1;

  const monday =
    new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() -
          daysFromMonday,
      ),
    );

  return [
    monday.getUTCFullYear(),
    String(
      monday.getUTCMonth() + 1,
    ).padStart(
      2,
      "0",
    ),
    String(
      monday.getUTCDate(),
    ).padStart(
      2,
      "0",
    ),
  ].join("-");
}

function periodFields(
  period: PublicRankingPeriod,
): PeriodFields {
  if (
    period ===
    "this-month"
  ) {
    return {
      keyField:
        "monthlyBoostKey",
      keyValue:
        currentUtcMonthKey(),
      totalField:
        "monthlyBoostTotalMinor",
    };
  }

  return {
    keyField:
      "weeklyBoostKey",
    keyValue:
      currentUtcWeekKey(),
    totalField:
      "weeklyBoostTotalMinor",
  };
}

function listingFromDocument(
  item: PublicCursorDocument,
): Listing {
  return {
    id:
      item.id,
    ...item.data(),
  } as Listing;
}

function commonPublicConstraints(
  listingTypeId?: string,
): QueryConstraint[] {
  const constraints:
    QueryConstraint[] = [
      where(
        "status",
        "==",
        "published",
      ),

      where(
        "visibilityScope",
        "==",
        "public",
      ),
    ];

  if (listingTypeId) {
    constraints.push(
      where(
        "listingTypeId",
        "==",
        listingTypeId,
      ),
    );
  }

  return constraints;
}

async function getRankedPage(
  options: {
    fields:
      PeriodFields;

    listingTypeId?:
      string;

    cursor:
      PublicCursorDocument | null;

    pageSize:
      number;

    tieBreakRule:
      TieBreakRule;
  },
) {
  const {
    fields,
    listingTypeId,
    cursor,
    pageSize,
    tieBreakRule,
  } = options;

  const constraints =
    commonPublicConstraints(
      listingTypeId,
    );

  constraints.push(
    where(
      fields.keyField,
      "==",
      fields.keyValue,
    ),

    orderBy(
      fields.totalField,
      "desc",
    ),

    tieBreakRule ===
      "earliest_reached_total"
      ? orderBy(
          "updatedAt",
          "asc",
        )
      : orderBy(
          "publishedAt",
          "desc",
        ),
  );

  if (cursor) {
    constraints.push(
      startAfter(
        cursor,
      ),
    );
  }

  constraints.push(
    limit(
      pageSize,
    ),
  );

  const snapshot =
    await getDocs(
      query(
        collection(
          db,
          "listings",
        ),
        ...constraints,
      ),
    );

  return snapshot.docs;
}

async function getUnrankedPage(
  options: {
    listingTypeId?: string;
    cursor:
      PublicCursorDocument | null;
    pageSize: number;
  },
) {
  const constraints =
    commonPublicConstraints(
      options.listingTypeId,
    );

  constraints.push(
    orderBy(
      "publishedAt",
      "desc",
    ),
  );

  if (options.cursor) {
    constraints.push(
      startAfter(
        options.cursor,
      ),
    );
  }

  constraints.push(
    limit(
      options.pageSize,
    ),
  );

  const snapshot =
    await getDocs(
      query(
        collection(
          db,
          "listings",
        ),
        ...constraints,
      ),
    );

  return snapshot.docs;
}

async function getFallbackPage(
  options: {
    fields:
      PeriodFields;

    listingTypeId?:
      string;

    cursor:
      PublicCursorDocument | null;

    needed:
      number;

    maxReadSize:
      number;
  },
): Promise<{
  items: Listing[];
  cursor:
    PublicCursorDocument | null;
  exhausted: boolean;
}> {
  const {
    fields,
    listingTypeId,
    needed,
    maxReadSize,
  } = options;

  let cursor =
    options.cursor;

  const items:
    Listing[] = [];

  let exhausted =
    false;

  while (
    items.length < needed &&
    !exhausted
  ) {
    const constraints =
      commonPublicConstraints(
        listingTypeId,
      );

    constraints.push(
      orderBy(
        "publishedAt",
        "desc",
      ),
    );

    if (cursor) {
      constraints.push(
        startAfter(
          cursor,
        ),
      );
    }

    const remaining =
      needed - items.length;

    const chunkSize =
      Math.max(
        remaining,
        Math.min(
          maxReadSize,
          remaining * 2,
        ),
      );

    constraints.push(
      limit(
        chunkSize,
      ),
    );

    const snapshot =
      await getDocs(
        query(
          collection(
            db,
            "listings",
          ),
          ...constraints,
        ),
      );

    if (
      snapshot.docs.length ===
      0
    ) {
      exhausted = true;
      break;
    }

    for (
      const document
      of snapshot.docs
    ) {
      cursor =
        document;

      const data =
        document.data();

      const isCurrentPeriod =
        String(
          data[
            fields.keyField
          ] ?? "",
        ) ===
        fields.keyValue;

      if (!isCurrentPeriod) {
        items.push(
          listingFromDocument(
            document,
          ),
        );
      }

      if (
        items.length >=
        needed
      ) {
        break;
      }
    }

    if (
      items.length <
        needed &&
      snapshot.docs.length <
        chunkSize
    ) {
      exhausted =
        true;
    }
  }

  return {
    items,
    cursor,
    exhausted,
  };
}

export async function getPublicListingsPage(
  options: {
    period:
      PublicRankingPeriod;

    listingTypeId?:
      string;

    cursor?:
      PublicListingCursor;

    pageSize?:
      number;
  },
): Promise<PublicListingPageResult> {
  const runtime =
    await getPublicRuntimeConfig();

  const {
    period,
    listingTypeId,
    cursor = null,
  } = options;

  const requestedPageSize =
    options.pageSize ??
    runtime.limits.publicPageSize;

  const pageSize =
    Math.max(
      1,
      Math.min(
        requestedPageSize,
        runtime.limits.publicPageSize,
      ),
    );

  const rankingEnabled =
    period === "this-week"
      ? runtime.ranking
          .publicWeeklyEnabled
      : runtime.ranking
          .publicMonthlyEnabled;

  if (!rankingEnabled) {
    const documents =
      await getUnrankedPage({
        listingTypeId,
        cursor:
          cursor?.fallbackCursor ??
          null,
        pageSize,
      });

    const nextCursor =
      documents.at(-1) ?? null;

    return {
      items:
        documents.map(
          listingFromDocument,
        ),
      cursor:
        documents.length ===
        pageSize
          ? {
              phase:
                "unranked",
              rankedCursor: null,
              fallbackCursor:
                nextCursor,
            }
          : null,
      hasMore:
        documents.length ===
        pageSize,
    };
  }

  const fields =
    periodFields(
      period,
    );

  if (
    cursor?.phase ===
    "fallback"
  ) {
    const fallback =
      await getFallbackPage({
        fields,
        listingTypeId,
        cursor:
          cursor.fallbackCursor,
        needed:
          pageSize,
        maxReadSize:
          runtime.limits
            .publicPageSize,
      });

    return {
      items:
        fallback.items,

      cursor:
        fallback.exhausted
          ? null
          : {
              phase:
                "fallback",

              rankedCursor:
                cursor.rankedCursor,

              fallbackCursor:
                fallback.cursor,
            },

      hasMore:
        !fallback.exhausted,
    };
  }

  const rankedDocuments =
    await getRankedPage({
      fields,
      listingTypeId,
      cursor:
        cursor?.phase === "ranked"
          ? cursor.rankedCursor
          : null,
      pageSize,
      tieBreakRule:
        runtime.ranking.tieBreakRule,
    });

  const rankedItems =
    rankedDocuments.map(
      listingFromDocument,
    );

  const rankedCursor =
    rankedDocuments.at(-1) ??
    (cursor?.phase === "ranked"
      ? cursor.rankedCursor
      : null);

  if (
    rankedItems.length ===
    pageSize
  ) {
    return {
      items:
        rankedItems,

      cursor: {
        phase:
          "ranked",

        rankedCursor,

        fallbackCursor:
          cursor?.fallbackCursor ??
          null,
      },

      hasMore:
        true,
    };
  }

  const remaining =
    pageSize -
    rankedItems.length;

  const fallback =
    await getFallbackPage({
      fields,
      listingTypeId,
      cursor:
        cursor?.fallbackCursor ??
        null,
      needed:
        remaining,
      maxReadSize:
        runtime.limits
          .publicPageSize,
    });

  const items = [
    ...rankedItems,
    ...fallback.items,
  ];

  return {
    items,

    cursor:
      fallback.exhausted
        ? null
        : {
            phase:
              "fallback",

            rankedCursor,

            fallbackCursor:
              fallback.cursor,
          },

    hasMore:
      !fallback.exhausted,
  };
}

export async function searchPublicListings(
  options: {
    searchText:
      string;

    listingTypeId?:
      string;

    maxResults?:
      number;
  },
): Promise<Listing[]> {
  const runtime =
    await getPublicRuntimeConfig();

  const {
    searchText,
    listingTypeId,
  } = options;

  const requestedMaxResults =
    options.maxResults ??
    runtime.limits.searchResultLimit;

  const maxResults =
    Math.max(
      1,
      Math.min(
        requestedMaxResults,
        runtime.limits.searchResultLimit,
      ),
    );

  const token =
    getPrimarySearchToken(
      searchText,
    );

  if (!token) {
    return [];
  }

  const constraints =
    commonPublicConstraints(
      listingTypeId,
    );

  constraints.push(
    where(
      "searchTokens",
      "array-contains",
      token,
    ),

    limit(
      maxResults,
    ),
  );

  const snapshot =
    await getDocs(
      query(
        collection(
          db,
          "listings",
        ),
        ...constraints,
      ),
    );

  const listings =
    snapshot.docs.map(
      listingFromDocument,
    );

  return listings.filter(
    (listing) =>
      matchesSearch(
        searchText,
        listing.title,
        listing.handle,
      ),
  );
}
