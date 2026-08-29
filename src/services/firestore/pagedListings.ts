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

export type PublicRankingPeriod =
  | "this-week"
  | "this-month";

type PublicCursorDocument =
  QueryDocumentSnapshot<DocumentData>;

export type PublicListingCursor =
  | {
      phase:
        "ranked";

      rankedCursor:
        PublicCursorDocument | null;

      fallbackCursor:
        PublicCursorDocument | null;
    }
  | {
      phase:
        "fallback";

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
  },
) {
  const {
    fields,
    listingTypeId,
    cursor,
    pageSize,
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

    const chunkSize =
      Math.max(
        20,
        needed * 2,
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
  const {
    period,
    listingTypeId,
    cursor = null,
    pageSize = 20,
  } = options;

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
        cursor?.rankedCursor ??
        null,
      pageSize,
    });

  const rankedItems =
    rankedDocuments.map(
      listingFromDocument,
    );

  const rankedCursor =
    rankedDocuments.at(-1) ??
    cursor?.rankedCursor ??
    null;

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
  const {
    searchText,
    listingTypeId,
    maxResults = 20,
  } = options;

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
