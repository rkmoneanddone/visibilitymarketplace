const process = require("node:process");

process.env.FIRESTORE_EMULATOR_HOST =
  "127.0.0.1:8080";

process.env.GCLOUD_PROJECT =
  "visibilitymarketplace";

const {
  initializeApp,
} = require(
  "firebase-admin/app",
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

const db =
  getFirestore();

async function verify() {
  const publicSnap =
    await db
      .collection("listings")
      .where(
        "visibilityScope",
        "==",
        "public",
      )
      .get();

  const boardSnap =
    await db
      .collection("boards")
      .where(
        "status",
        "==",
        "active",
      )
      .get();

  const publicRows =
    publicSnap.docs
      .map(
        (doc) => ({
          id:
            doc.id,
          type:
            doc.data()
              .listingTypeId,
          title:
            doc.data().title,
          weekly:
            doc.data()
              .weeklyBoostTotalMinor,
          monthly:
            doc.data()
              .monthlyBoostTotalMinor,
        }),
      )
      .sort(
        (a, b) =>
          b.weekly -
          a.weekly,
      );

  const boardRows =
    [];

  for (
    const boardDoc of
    boardSnap.docs
  ) {
    const boardData =
      boardDoc.data();

    const entrySnap =
      await db
        .collection(
          "boardEntries",
        )
        .where(
          "boardId",
          "==",
          boardDoc.id,
        )
        .where(
          "status",
          "==",
          "entered",
        )
        .get();

    boardRows.push({
      id:
        boardDoc.id,
      name:
        boardData.name,
      type:
        boardData
          .listingTypeId,
      entryFeeMinor:
        boardData
          .entryFeeMinor,
      minimumBoostMinor:
        boardData
          .minimumBoostMinor,
      enteredCount:
        entrySnap.size,
      entries:
        entrySnap.docs
          .map(
            (doc) => ({
              id:
                doc.id,
              boost:
                doc.data()
                  .boostTotalMinor,
            }),
          )
          .sort(
            (a, b) =>
              b.boost -
              a.boost,
          ),
    });
  }

  const pendingId =
    "dev-board-youtube_dev-board-entry-payment";

  const pendingSnap =
    await db
      .collection(
        "boardEntries",
      )
      .doc(
        pendingId,
      )
      .get();

  console.log("");
  console.log(
    "=== ViewBid DEV Dataset ===",
  );

  console.dir(
    {
      publicCount:
        publicSnap.size,
      publicListings:
        publicRows,
      boardCount:
        boardSnap.size,
      boards:
        boardRows,
      pendingBoardEntry: {
        id:
          pendingId,
        status:
          pendingSnap.exists
            ? pendingSnap
                .data()
                .status
            : "missing",
      },
    },
    {
      depth:
        null,
    },
  );

  console.log("");
}

verify()
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
