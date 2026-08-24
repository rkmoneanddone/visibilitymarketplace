require("dotenv").config();

const path = require("path");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = require(
  path.resolve(__dirname, "../secrets/firebase-admin-key.json")
);

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

async function seed() {
  console.log("Seeding Firestore...");

  await db
    .collection("boardPeriods")
    .doc("weekly-2026-08-24")
    .set({
      startsAt: "2026-08-24T00:00:00+05:30",
      endsAt: "2026-08-30T23:59:59+05:30",
      status: "active",
      createdAt: "2026-08-24T00:00:00+05:30",
    });

  console.log("[OK] Board period created");

  await db
    .collection("listings")
    .doc("finance-with-abc")
    .set({
      ownerId: "demo-owner-1",

      listingTypeId: "youtube",
      categoryId: "finance",
      subcategoryId: "stock-market",

      title: "Finance With ABC",
      slug: "finance-with-abc",
      handle: "@financewithabc",
      ownerDisplayName: "ABC Media",

      shortDescription:
        "Simple investing and market education for everyday investors.",

      description:
        "Simple investing and market education for everyday investors.",

      externalUrl: "https://example.com",

      country: "IN",
      language: "en",

      status: "published",

      externalClicks: 0,
      currentBoostTotalMinor: 4600,
      currentBoardRank: 1,

      createdAt: "2026-08-24T00:00:00+05:30",
      updatedAt: "2026-08-24T00:00:00+05:30",
      publishedAt: "2026-08-24T00:00:00+05:30",
    });

  console.log("[OK] Listing created");
  console.log("[OK] Firestore seed complete");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[ERROR] Seed failed");
    console.error(error);
    process.exit(1);
  });