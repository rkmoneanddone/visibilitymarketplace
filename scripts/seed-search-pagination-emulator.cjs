const process =
  require("node:process");

process.env.FIRESTORE_EMULATOR_HOST =
  "127.0.0.1:8080";

process.env.GCLOUD_PROJECT =
  "visibilitymarketplace";

const {
  initializeApp,
} =
  require(
    "firebase-admin/app",
  );

const {
  getFirestore,
} =
  require(
    "firebase-admin/firestore",
  );

initializeApp({
  projectId:
    "visibilitymarketplace",
});

const db =
  getFirestore();

const USER_ID =
  "dev-publisher";

const PREFIX =
  "dev-search-";

function slugify(value) {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

function currentUtcMonthKey() {
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

function currentUtcWeekKey() {
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

function buildSearchTokens(
  ...values
) {
  const result =
    new Set();

  for (
    const rawValue
    of values
  ) {
    const normalized =
      String(
        rawValue ?? "",
      )
        .trim()
        .toLowerCase()
        .replace(
          /@/g,
          " ",
        )
        .replace(
          /[^a-z0-9]+/g,
          " ",
        )
        .replace(
          /\s+/g,
          " ",
        )
        .trim();

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
          word.slice(
            0,
            size,
          ),
        );
      }
    }
  }

  return Array.from(
    result,
  );
}

function isoOffset(hours) {
  return new Date(
    Date.now() +
      hours *
        60 *
        60 *
        1000,
  ).toISOString();
}

function pad(value) {
  return String(
    value,
  ).padStart(
    2,
    "0",
  );
}

async function deletePrefix(
  collectionName,
) {
  const snapshot =
    await db
      .collection(
        collectionName,
      )
      .get();

  const docs =
    snapshot.docs.filter(
      (item) =>
        item.id.startsWith(
          PREFIX,
        ),
    );

  for (
    let offset = 0;
    offset < docs.length;
    offset += 400
  ) {
    const batch =
      db.batch();

    for (
      const item
      of docs.slice(
        offset,
        offset + 400,
      )
    ) {
      batch.delete(
        item.ref,
      );
    }

    await batch.commit();
  }
}

function makePublicListing(
  index,
) {
  const number =
    pad(index);

  const id =
    `${PREFIX}public-${number}`;

  const title =
    index === 27
      ? "Best YouTube Channel in Ranchi"
      : `DEV Public Listing ${number}`;

  const handle =
    index === 27
      ? "@ranchiyoutube27"
      : `@devpublic${number}`;

  const boostMinor =
    (31 - index) * 100;

  const now =
    new Date().toISOString();

  return {
    id,
    submittedByUserId:
      USER_ID,
    visibilityScope:
      "public",
    listingTypeId:
      "youtube",
    platformKey:
      "youtube",
    targetKind:
      "channel",
    categoryId:
      "technology",
    title,
    slug:
      slugify(title),
    handle,
    searchTokens:
      buildSearchTokens(
        title,
        handle,
      ),
    shortDescription:
      "Search and pagination emulator listing.",
    externalUrl:
      `https://example.com/public/${number}`,
    status:
      "published",
    externalClicks:
      0,
    currentBoostTotalMinor:
      boostMinor,
    weeklyBoostKey:
      currentUtcWeekKey(),
    weeklyBoostTotalMinor:
      boostMinor,
    monthlyBoostKey:
      currentUtcMonthKey(),
    monthlyBoostTotalMinor:
      boostMinor,
    createdAt:
      now,
    updatedAt:
      now,
    publishedAt:
      now,
  };
}

function makeBoard(
  index,
) {
  const number =
    pad(index);

  const id =
    `${PREFIX}board-${number}`;

  const name =
    index === 26
      ? "Ranchi Creator Discovery Board"
      : `DEV Search Board ${number}`;

  const now =
    new Date(
      Date.now() -
        index * 1000,
    ).toISOString();

  return {
    id,
    name,
    slug:
      slugify(name),
    searchTokens:
      buildSearchTokens(
        name,
      ),
    createdByUserId:
      USER_ID,
    createdByDisplayName:
      "DEV Publisher",
    createdByEmail:
      "dev.publisher@viewbid.local",
    status:
      "active",
    listingTypeId:
      "youtube",
    categoryId:
      "technology",
    startsAt:
      isoOffset(-2),
    entryStartsAt:
      isoOffset(-1),
    entryClosesAt:
      isoOffset(24),
    endsAt:
      isoOffset(48),
    entryFeeMinor:
      100,
    minimumBoostMinor:
      100,
    currency:
      "USD",
    createdAt:
      now,
    updatedAt:
      now,
  };
}

function makeBoardListing(
  index,
) {
  const number =
    pad(index);

  const id =
    `${PREFIX}board-listing-${number}`;

  const title =
    index === 28
      ? "Best Ranchi Video Entry 28"
      : `DEV Board Listing Entry ${index}`;

  const handle =
    index === 28
      ? "@ranchiboard28"
      : `@devboardentry${number}`;

  const now =
    new Date().toISOString();

  return {
    id,
    submittedByUserId:
      USER_ID,
    visibilityScope:
      "board_only",
    listingTypeId:
      "youtube",
    platformKey:
      "youtube",
    targetKind:
      "video",
    categoryId:
      "technology",
    title,
    slug:
      slugify(title),
    handle,
    searchTokens:
      buildSearchTokens(
        title,
        handle,
      ),
    shortDescription:
      "Board search pagination emulator listing.",
    externalUrl:
      `https://example.com/board/${number}`,
    status:
      "published",
    externalClicks:
      0,
    currentBoostTotalMinor:
      0,
    weeklyBoostKey:
      currentUtcWeekKey(),
    weeklyBoostTotalMinor:
      0,
    monthlyBoostKey:
      currentUtcMonthKey(),
    monthlyBoostTotalMinor:
      0,
    createdAt:
      now,
    updatedAt:
      now,
    publishedAt:
      now,
  };
}

function makeBoardEntry(
  boardId,
  listing,
  index,
) {
  const boostMinor =
    (31 - index) * 100;

  const now =
    new Date().toISOString();

  return {
    id:
      `${boardId}_${listing.id}`,
    boardId,
    listingId:
      listing.id,
    submittedByUserId:
      USER_ID,
    status:
      "entered",
    entryFeeMinor:
      100,
    currency:
      "USD",
    entryPaymentId:
      "emulator_seed",
    boostTotalMinor:
      boostMinor,
    supporterCount:
      1,
    externalClicks:
      0,

    searchTokens:
      buildSearchTokens(
        listing.title,
        listing.handle,
      ),

    listingTitle:
      listing.title,

    listingHandle:
      listing.handle,

    listingExternalUrl:
      listing.externalUrl,

    listingFeaturedImageUrl:
      null,

    listingTypeId:
      listing.listingTypeId,

    joinedAt:
      now,
    updatedAt:
      now,
  };
}

async function seedPublicListings() {
  for (
    let index = 1;
    index <= 30;
    index += 1
  ) {
    const listing =
      makePublicListing(
        index,
      );

    await db
      .collection(
        "listings",
      )
      .doc(
        listing.id,
      )
      .set(
        listing,
      );
  }
}

async function seedBoards() {
  for (
    let index = 1;
    index <= 30;
    index += 1
  ) {
    const board =
      makeBoard(
        index,
      );

    await db
      .collection(
        "boards",
      )
      .doc(
        board.id,
      )
      .set(
        board,
      );
  }
}

async function seedBoardListings() {
  const boardId =
    `${PREFIX}board-01`;

  for (
    let index = 1;
    index <= 30;
    index += 1
  ) {
    const listing =
      makeBoardListing(
        index,
      );

    await db
      .collection(
        "listings",
      )
      .doc(
        listing.id,
      )
      .set(
        listing,
      );

    const entry =
      makeBoardEntry(
        boardId,
        listing,
        index,
      );

    await db
      .collection(
        "boardEntries",
      )
      .doc(
        entry.id,
      )
      .set(
        entry,
      );
  }
}

async function seed() {
  console.log(
    "Deleting prior dev-search-* emulator seed...",
  );

  await deletePrefix(
    "boardEntries",
  );

  await deletePrefix(
    "boards",
  );

  await deletePrefix(
    "listings",
  );

  console.log(
    "Creating 30 Public Listings...",
  );

  await seedPublicListings();

  console.log(
    "Creating 30 Boards...",
  );

  await seedBoards();

  console.log(
    "Creating 30 listings inside dev-search-board-01...",
  );

  await seedBoardListings();

  console.log("");
  console.log(
    "Search/pagination DEV seed complete.",
  );
  console.log(
    "Public Listings: 30",
  );
  console.log(
    "Boards: 30",
  );
  console.log(
    "Listings in dev-search-board-01: 30",
  );
  console.log("");
  console.log(
    "Useful search tests:",
  );
  console.log(
    "Public: ranchi -> Best YouTube Channel in Ranchi (position 27 by boost)",
  );
  console.log(
    "Boards: ranchi -> Ranchi Creator Discovery Board",
  );
  console.log(
    "Board: Entry 3 -> DEV Board Listing Entry 3",
  );
  console.log(
    "Board: ranchi -> Best Ranchi Video Entry 28",
  );
  console.log(
    "Board handle: devboardentry25",
  );
}

seed()
  .then(
    () =>
      process.exit(0),
  )
  .catch(
    (error) => {
      console.error(
        error,
      );

      process.exit(1);
    },
  );
