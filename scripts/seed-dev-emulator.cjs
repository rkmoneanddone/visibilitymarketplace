const process = require("node:process");

process.env.FIRESTORE_EMULATOR_HOST =
  "127.0.0.1:8080";

process.env.FIREBASE_AUTH_EMULATOR_HOST =
  "127.0.0.1:9099";

process.env.GCLOUD_PROJECT =
  "visibilitymarketplace";

const {
  initializeApp,
} = require(
  "firebase-admin/app",
);

const {
  getAuth,
} = require(
  "firebase-admin/auth",
);

const {
  getFirestore,
} = require(
  "firebase-admin/firestore",
);

initializeApp({
  projectId:
    "visibilitymarketplace",
});

const auth =
  getAuth();

const db =
  getFirestore();

const USER_ID =
  "dev-publisher";

const USER_EMAIL =
  "dev.publisher@viewbid.local";

const USER_PASSWORD =
  "ViewBidDev123!";

function isoOffset(hours) {
  return new Date(
    Date.now() +
      hours * 60 * 60 * 1000,
  ).toISOString();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function currentUtcMonthKey() {
  const now = new Date();

  return [
    now.getUTCFullYear(),
    String(
      now.getUTCMonth() + 1,
    ).padStart(2, "0"),
  ].join("-");
}

function currentUtcWeekKey() {
  const now = new Date();
  const day = now.getUTCDay();

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
    ).padStart(2, "0"),
    String(
      monday.getUTCDate(),
    ).padStart(2, "0"),
  ].join("-");
}

async function ensureUser() {
  try {
    await auth.getUser(
      USER_ID,
    );

    await auth.updateUser(
      USER_ID,
      {
        email:
          USER_EMAIL,
        password:
          USER_PASSWORD,
        displayName:
          "DEV Publisher",
      },
    );
  } catch (error) {
    if (
      error?.code !==
      "auth/user-not-found"
    ) {
      throw error;
    }

    await auth.createUser({
      uid:
        USER_ID,
      email:
        USER_EMAIL,
      password:
        USER_PASSWORD,
      displayName:
        "DEV Publisher",
      emailVerified:
        true,
    });
  }

  const now =
    new Date().toISOString();

  await db
    .collection("users")
    .doc(USER_ID)
    .set(
      {
        uid:
          USER_ID,
        email:
          USER_EMAIL,
        displayName:
          "DEV Publisher",
        role:
          "supporter",
        createdAt:
          now,
        updatedAt:
          now,
      },
      {
        merge: true,
      },
    );
}

function makeListing({
  id,
  title,
  listingTypeId,
  targetKind,
  categoryId =
    "technology",
  visibilityScope =
    "public",
  boostMinor =
    0,
}) {
  const now =
    new Date().toISOString();

  return {
    id,
    submittedByUserId:
      USER_ID,
    visibilityScope,
    listingTypeId,
    platformKey:
      listingTypeId,
    targetKind,
    categoryId,
    title,
    slug:
      slugify(title),
    handle:
      `@${id}`,
    shortDescription:
      "Local emulator ranking test listing.",
    externalUrl:
      "https://example.com",
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

function makeBoard(config) {
  const now =
    new Date().toISOString();

  return {
    id:
      config.id,
    name:
      config.name,
    slug:
      slugify(
        config.name,
      ),
    createdByUserId:
      USER_ID,
    createdByDisplayName:
      "DEV Publisher",
    createdByEmail:
      USER_EMAIL,
    status:
      "active",
    listingTypeId:
      config.listingTypeId,
    categoryId:
      config.categoryId,
    startsAt:
      isoOffset(-2),
    entryStartsAt:
      isoOffset(-1),
    entryClosesAt:
      isoOffset(24),
    endsAt:
      isoOffset(48),
    entryFeeMinor:
      config.entryFeeMinor,
    minimumBoostMinor:
      config.minimumBoostMinor,
    currency:
      "USD",
    createdAt:
      now,
    updatedAt:
      now,
  };
}

function makeBoardEntry({
  boardId,
  listingId,
  entryFeeMinor,
  boostMinor =
    0,
  status =
    "entered",
}) {
  const now =
    new Date().toISOString();

  return {
    id:
      `${boardId}_${listingId}`,
    boardId,
    listingId,
    submittedByUserId:
      USER_ID,
    status,
    entryFeeMinor,
    currency:
      "USD",
    entryPaymentId:
      status === "entered"
        ? "emulator_seed"
        : null,
    boostTotalMinor:
      boostMinor,
    supporterCount:
      boostMinor > 0
        ? 1
        : 0,
    externalClicks:
      0,
    joinedAt:
      now,
    updatedAt:
      now,
  };
}

const publicListings = [
  {
    id:
      "dev-public-youtube",
    title:
      "DEV YouTube Channel",
    listingTypeId:
      "youtube",
    targetKind:
      "channel",
    boostMinor:
      900,
  },
  {
    id:
      "dev-public-app",
    title:
      "DEV Mobile App",
    listingTypeId:
      "app",
    targetKind:
      "app",
    boostMinor:
      700,
  },
  {
    id:
      "dev-public-website",
    title:
      "DEV Website",
    listingTypeId:
      "website",
    targetKind:
      "website",
    boostMinor:
      500,
  },
  {
    id:
      "dev-public-startup",
    title:
      "DEV Startup",
    listingTypeId:
      "startup",
    targetKind:
      "startup",
    boostMinor:
      300,
  },
  {
    id:
      "dev-public-instagram",
    title:
      "DEV Instagram Profile",
    listingTypeId:
      "instagram",
    targetKind:
      "profile",
    boostMinor:
      100,
  },
];

const boards = [
  {
    id:
      "dev-board-youtube",
    name:
      "DEV YouTube Board",
    listingTypeId:
      "youtube",
    targetKind:
      "video",
    categoryId:
      "technology",
    entryFeeMinor:
      100,
    minimumBoostMinor:
      100,
  },
  {
    id:
      "dev-board-apps",
    name:
      "DEV Mobile Apps and Productivity Tools Discovery Board",
    listingTypeId:
      "app",
    targetKind:
      "app",
    categoryId:
      "technology",
    entryFeeMinor:
      300,
    minimumBoostMinor:
      200,
  },
  {
    id:
      "dev-board-websites",
    name:
      "DEV Websites Board",
    listingTypeId:
      "website",
    targetKind:
      "website",
    categoryId:
      "technology",
    entryFeeMinor:
      500,
    minimumBoostMinor:
      300,
  },
];

const boardBoosts = [
  1200,
  900,
  600,
  300,
  100,
];

async function deleteCollectionDocs(
  collectionName,
  prefix,
) {
  const snapshot =
    await db
      .collection(
        collectionName,
      )
      .get();

  const batch =
    db.batch();

  let count =
    0;

  for (
    const doc of
    snapshot.docs
  ) {
    if (
      doc.id.startsWith(
        prefix,
      )
    ) {
      batch.delete(
        doc.ref,
      );
      count += 1;
    }
  }

  if (count > 0) {
    await batch.commit();
  }
}

async function clearDevSeed() {
  await deleteCollectionDocs(
    "paymentIntents",
    "",
  );

  await deleteCollectionDocs(
    "boardEntries",
    "dev-",
  );

  await deleteCollectionDocs(
    "boards",
    "dev-",
  );

  await deleteCollectionDocs(
    "listings",
    "dev-",
  );
}

async function seedPublicListings() {
  for (
    const config of
    publicListings
  ) {
    await db
      .collection("listings")
      .doc(config.id)
      .set(
        makeListing({
          ...config,
          visibilityScope:
            "public",
        }),
      );
  }
}

async function seedBoards() {
  for (
    const boardConfig of
    boards
  ) {
    await db
      .collection("boards")
      .doc(
        boardConfig.id,
      )
      .set(
        makeBoard(
          boardConfig,
        ),
      );

    for (
      let index = 0;
      index < 5;
      index += 1
    ) {
      const number =
        index + 1;

      const listingId =
        `${boardConfig.id}-listing-${number}`;

      const title =
        `${boardConfig.name} Entry ${number}`;

      await db
        .collection("listings")
        .doc(listingId)
        .set(
          makeListing({
            id:
              listingId,
            title,
            listingTypeId:
              boardConfig
                .listingTypeId,
            targetKind:
              boardConfig
                .targetKind,
            categoryId:
              boardConfig
                .categoryId,
            visibilityScope:
              "board_only",
            boostMinor:
              0,
          }),
        );

      await db
        .collection(
          "boardEntries",
        )
        .doc(
          `${boardConfig.id}_${listingId}`,
        )
        .set(
          makeBoardEntry({
            boardId:
              boardConfig.id,
            listingId,
            entryFeeMinor:
              boardConfig
                .entryFeeMinor,
            boostMinor:
              boardBoosts[index],
          }),
        );
    }
  }
}

async function seedPendingBoardEntry() {
  const boardConfig =
    boards[0];

  const listingId =
    "dev-board-entry-payment";

  await db
    .collection("listings")
    .doc(listingId)
    .set(
      makeListing({
        id:
          listingId,
        title:
          "DEV Pending Board Entry",
        listingTypeId:
          boardConfig
            .listingTypeId,
        targetKind:
          boardConfig
            .targetKind,
        categoryId:
          boardConfig
            .categoryId,
        visibilityScope:
          "board_only",
      }),
    );

  await db
    .collection(
      "boardEntries",
    )
    .doc(
      `${boardConfig.id}_${listingId}`,
    )
    .set(
      makeBoardEntry({
        boardId:
          boardConfig.id,
        listingId,
        entryFeeMinor:
          boardConfig
            .entryFeeMinor,
        boostMinor:
          0,
        status:
          "pending_payment",
      }),
    );
}

async function seed() {
  await ensureUser();

  await clearDevSeed();

  await seedPublicListings();

  await seedBoards();

  await seedPendingBoardEntry();

  console.log("");
  console.log(
    "ViewBid clean DEV seed complete.",
  );
  console.log(
    `Login: ${USER_EMAIL}`,
  );
  console.log(
    `Password: ${USER_PASSWORD}`,
  );
  console.log("");
  console.log(
    "Public: 5 listings across YouTube, App, Website, Startup, Instagram",
  );
  console.log(
    "Boards: 3 active Boards",
  );
  console.log(
    "YouTube: Entry $1 / Push $1",
  );
  console.log(
    "Apps: Entry $3 / Push $2",
  );
  console.log(
    "Websites: Entry $5 / Push $3",
  );
  console.log(
    "Each Board: 5 entered listings",
  );
  console.log(
    "Pending Board Entry: dev-board-youtube_dev-board-entry-payment",
  );
  console.log("");
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
