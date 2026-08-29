import {
  FieldValue,
  type Firestore,
} from "firebase-admin/firestore";

import {
  HttpsError,
} from "firebase-functions/v2/https";

export type PaymentPurpose =
  | "listing_submission"
  | "listing_push"
  | "board_activation"
  | "board_entry"
  | "board_entry_push";

export type PaymentTargetKind =
  | "listing"
  | "board"
  | "board_entry";

export type PaymentRequestInput = {
  purpose: PaymentPurpose;
  targetKind: PaymentTargetKind;
  targetId: string;
  amountMinor: number;
  currency: string;
  description?: string;
};

type ValidatedPaymentIntent = {
  purpose: PaymentPurpose;
  targetKind: PaymentTargetKind;
  targetId: string;
  amountMinor: number;
  currency: string;
  description: string;
  boardId?: string;
  listingId?: string;
};

function normalizeString(
  value: unknown,
): string {
  return String(
    value ?? "",
  ).trim();
}

export type MarketplacePricingConfig = {
  listingFeesMinor:
    Record<string, number>;
  publicPushMinimumMinor:
    Record<string, number>;
  boardActivationFeeMinor:
    number;
  boardEntryMinimumMinor:
    number;
  boardPushMinimumMinor:
    number;
  maximumPaymentMinor:
    number;
  currency:
    "USD";
};

const DEFAULT_PRICING:
  MarketplacePricingConfig = {
    listingFeesMinor: {
      youtube: 100,
      facebook: 100,
      instagram: 100,
      x: 100,
      app: 299,
      startup: 499,
      website: 199,
      other: 199,
    },

    publicPushMinimumMinor: {
      youtube: 100,
      facebook: 100,
      instagram: 100,
      x: 100,
      app: 100,
      startup: 100,
      website: 100,
      other: 100,
    },

    boardActivationFeeMinor:
      200,

    boardEntryMinimumMinor:
      100,

    boardPushMinimumMinor:
      100,

    maximumPaymentMinor:
      99900,

    currency:
      "USD",
  };

function normalizeConfiguredMoney(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const amount =
    Number(value);

  if (
    !Number.isSafeInteger(amount) ||
    amount < minimum ||
    amount > maximum
  ) {
    return fallback;
  }

  return amount;
}

export async function getMarketplacePricingConfig(
  db: Firestore,
): Promise<MarketplacePricingConfig> {
  const snapshot =
    await db
      .collection(
        "marketplaceConfig",
      )
      .doc("pricing")
      .get();

  if (!snapshot.exists) {
    return {
      ...DEFAULT_PRICING,
      listingFeesMinor: {
        ...DEFAULT_PRICING
          .listingFeesMinor,
      },
      publicPushMinimumMinor: {
        ...DEFAULT_PRICING
          .publicPushMinimumMinor,
      },
    };
  }

  const data =
    snapshot.data() || {};

  const maximumPaymentMinor =
    normalizeConfiguredMoney(
      data.maximumPaymentMinor,
      DEFAULT_PRICING
        .maximumPaymentMinor,
      100,
      99900,
    );

  const listingFeesMinor:
    Record<string, number> = {};

  const publicPushMinimumMinor:
    Record<string, number> = {};

  for (
    const typeId
    of Object.keys(
      DEFAULT_PRICING
        .listingFeesMinor,
    )
  ) {
    listingFeesMinor[typeId] =
      normalizeConfiguredMoney(
        data.listingFeesMinor?.[
          typeId
        ],
        DEFAULT_PRICING
          .listingFeesMinor[
            typeId
          ],
        0,
        maximumPaymentMinor,
      );

    publicPushMinimumMinor[
      typeId
    ] =
      normalizeConfiguredMoney(
        data.publicPushMinimumMinor?.[
          typeId
        ],
        DEFAULT_PRICING
          .publicPushMinimumMinor[
            typeId
          ],
        100,
        maximumPaymentMinor,
      );
  }

  return {
    listingFeesMinor,

    publicPushMinimumMinor,

    boardActivationFeeMinor:
      normalizeConfiguredMoney(
        data.boardActivationFeeMinor,
        DEFAULT_PRICING
          .boardActivationFeeMinor,
        100,
        maximumPaymentMinor,
      ),

    boardEntryMinimumMinor:
      normalizeConfiguredMoney(
        data.boardEntryMinimumMinor,
        DEFAULT_PRICING
          .boardEntryMinimumMinor,
        100,
        maximumPaymentMinor,
      ),

    boardPushMinimumMinor:
      normalizeConfiguredMoney(
        data.boardPushMinimumMinor,
        DEFAULT_PRICING
          .boardPushMinimumMinor,
        100,
        maximumPaymentMinor,
      ),

    maximumPaymentMinor,

    currency:
      "USD",
  };
}

async function getListingTypePricing(
  db: Firestore,
  listingTypeId: unknown,
) {
  const typeId =
    normalizeString(
      listingTypeId,
    );

  const config =
    await getMarketplacePricingConfig(
      db,
    );

  if (
    !(typeId in
      config.listingFeesMinor)
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Listing Type pricing is not configured.",
    );
  }

  return {
    listingFeeMinor:
      config.listingFeesMinor[
        typeId
      ],

    minimumBoostMinor:
      config.publicPushMinimumMinor[
        typeId
      ],

    boostingEnabled:
      true,
  };
}

async function getPublicListingPricing(
  db: Firestore,
  listingTypeId: unknown,
) {
  const pricing =
    await getListingTypePricing(
      db,
      listingTypeId,
    );

  if (!pricing.boostingEnabled) {
    throw new HttpsError(
      "failed-precondition",
      "Push Up is not available for this Listing Type.",
    );
  }

  return pricing;
}

function getUtcMonthKey(
  date: Date,
): string {
  return [
    date.getUTCFullYear(),
    String(
      date.getUTCMonth() + 1,
    ).padStart(2, "0"),
  ].join("-");
}

function getUtcWeekKey(
  date: Date,
): string {
  const day =
    date.getUTCDay();

  const daysFromMonday =
    day === 0
      ? 6
      : day - 1;

  const monday =
    new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() -
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

function assertMoney(
  amountMinor: number,
) {
  if (
    !Number.isSafeInteger(
      amountMinor,
    ) ||
    amountMinor < 100 ||
    amountMinor > 99900
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid payment amount.",
    );
  }
}

export async function validatePaymentRequest(
  db: Firestore,
  rawInput: unknown,
  actorUserId: string | null = null,
): Promise<ValidatedPaymentIntent> {
  const input =
    rawInput as
      | Partial<PaymentRequestInput>
      | null
      | undefined;

  const purpose =
    normalizeString(
      input?.purpose,
    ) as PaymentPurpose;

  const targetKind =
    normalizeString(
      input?.targetKind,
    ) as PaymentTargetKind;

  const targetId =
    normalizeString(
      input?.targetId,
    );

  const amountMinor =
    Number(
      input?.amountMinor,
    );

  const currency =
    normalizeString(
      input?.currency ||
      "USD",
    ).toUpperCase();

  const description =
    normalizeString(
      input?.description,
    ).slice(0, 160);

  if (
    ![
      "listing_submission",
      "listing_push",
      "board_activation",
      "board_entry",
      "board_entry_push",
    ].includes(
      purpose,
    )
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Unsupported payment purpose.",
    );
  }

  if (
    ![
      "listing",
      "board",
      "board_entry",
    ].includes(
      targetKind,
    )
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Unsupported payment target.",
    );
  }

  if (!targetId) {
    throw new HttpsError(
      "invalid-argument",
      "Payment target is required.",
    );
  }

  if (currency !== "USD") {
    throw new HttpsError(
      "invalid-argument",
      "Unsupported currency.",
    );
  }

  assertMoney(
    amountMinor,
  );

  if (
    purpose ===
    "listing_submission"
  ) {
    if (!actorUserId) {
      throw new HttpsError(
        "unauthenticated",
        "Authentication is required to pay a Listing submission fee.",
      );
    }

    if (targetKind !== "listing") {
      throw new HttpsError(
        "invalid-argument",
        "Listing submission payment requires a Listing target.",
      );
    }

    const listingSnap =
      await db
        .collection("listings")
        .doc(targetId)
        .get();

    if (!listingSnap.exists) {
      throw new HttpsError(
        "not-found",
        "Listing not found.",
      );
    }

    const listing =
      listingSnap.data();

    if (
      normalizeString(
        listing?.submittedByUserId,
      ) !== actorUserId
    ) {
      throw new HttpsError(
        "permission-denied",
        "Only the Listing creator can pay its submission fee.",
      );
    }

    if (
      listing?.status !==
      "payment_pending"
    ) {
      throw new HttpsError(
        "failed-precondition",
        "This Listing is not awaiting its submission fee.",
      );
    }

    const snapshotFeeMinor =
      Number(
        listing?.submissionFeeMinor,
      );

    if (
      !Number.isSafeInteger(
        snapshotFeeMinor,
      ) ||
      snapshotFeeMinor <= 0
    ) {
      throw new HttpsError(
        "failed-precondition",
        "This Listing does not have a valid submission fee snapshot.",
      );
    }

    if (
      amountMinor !==
      snapshotFeeMinor
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Listing submission fee does not match the configured Listing Type fee.",
      );
    }

    return {
      purpose,
      targetKind,
      targetId,
      amountMinor,
      currency,
      description:
        description ||
        "Listing submission - " +
          String(
            listing?.title ||
            "listing",
          ),
      listingId:
        targetId,
    };
  }

  if (
    purpose === "listing_push"
  ) {
    if (
      targetKind !==
      "listing"
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Listing Push Up requires a Listing target.",
      );
    }

    const listingSnap =
      await db
        .collection("listings")
        .doc(targetId)
        .get();

    if (!listingSnap.exists) {
      throw new HttpsError(
        "not-found",
        "Listing not found.",
      );
    }

    const listing =
      listingSnap.data();

    if (
      listing?.status !==
      "published"
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Only published listings can be pushed.",
      );
    }

    const visibilityScope =
      normalizeString(
        listing?.visibilityScope ||
        "public",
      );

    if (
      visibilityScope ===
      "board_only"
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Board-only listings cannot receive a Public Push Up.",
      );
    }

    const pricing =
      await getPublicListingPricing(
        db,
        listing?.listingTypeId,
      );

    if (
      amountMinor <
      pricing.minimumBoostMinor
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Push Up amount is below the Listing Type minimum.",
      );
    }

    return {
      purpose,
      targetKind,
      targetId,
      amountMinor,
      currency,
      description:
        description ||
        `Push Up ${String(
          listing.title ||
          "listing",
        )}`,
      listingId:
        targetId,
    };
  }

  if (
    purpose ===
    "board_activation"
  ) {
    if (!actorUserId) {
      throw new HttpsError(
        "unauthenticated",
        "Authentication is required to activate a Board.",
      );
    }

    if (targetKind !== "board") {
      throw new HttpsError(
        "invalid-argument",
        "Board activation requires a Board target.",
      );
    }

    const boardSnap =
      await db
        .collection("boards")
        .doc(targetId)
        .get();

    if (!boardSnap.exists) {
      throw new HttpsError(
        "not-found",
        "Board not found.",
      );
    }

    const board =
      boardSnap.data();

    if (
      normalizeString(
        board?.createdByUserId,
      ) !== actorUserId
    ) {
      throw new HttpsError(
        "permission-denied",
        "Only the Board creator can activate this Board.",
      );
    }

    if (
      board?.status !==
      "awaiting_activation_payment"
    ) {
      throw new HttpsError(
        "failed-precondition",
        "This Board is not awaiting activation payment.",
      );
    }

    const activationFeeMinor =
      Number(
        board?.activationFeeMinor,
      );

    if (
      !Number.isSafeInteger(
        activationFeeMinor,
      ) ||
      activationFeeMinor < 100 ||
      amountMinor !==
        activationFeeMinor
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Board activation fee does not match the Board.",
      );
    }

    const entryClosesAt =
      new Date(
        String(
          board?.entryClosesAt ||
          "",
        ),
      ).getTime();

    const endsAt =
      new Date(
        String(
          board?.endsAt ||
          "",
        ),
      ).getTime();

    if (
      Number.isNaN(
        entryClosesAt,
      ) ||
      Number.isNaN(
        endsAt,
      ) ||
      Date.now() >=
        entryClosesAt ||
      Date.now() >=
        endsAt
    ) {
      throw new HttpsError(
        "failed-precondition",
        "This Board can no longer be activated because its entry window has closed.",
      );
    }

    return {
      purpose,
      targetKind,
      targetId,
      amountMinor,
      currency,
      description:
        description ||
        "Activate Board - " +
          String(
            board?.name ||
            "Board",
          ),
      boardId:
        targetId,
    };
  }

  if (
    targetKind !==
    "board_entry"
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Board payment requires a Board Entry target.",
    );
  }

  const entryRef =
    db
      .collection(
        "boardEntries",
      )
      .doc(targetId);

  const entrySnap =
    await entryRef.get();

  if (!entrySnap.exists) {
    throw new HttpsError(
      "not-found",
      "Board Entry not found.",
    );
  }

  const entry =
    entrySnap.data();

  const boardId =
    normalizeString(
      entry?.boardId,
    );

  const listingId =
    normalizeString(
      entry?.listingId,
    );

  if (
    !boardId ||
    !listingId
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Board Entry data is incomplete.",
    );
  }

  const boardSnap =
    await db
      .collection("boards")
      .doc(boardId)
      .get();

  if (!boardSnap.exists) {
    throw new HttpsError(
      "not-found",
      "Board not found.",
    );
  }

  const board =
    boardSnap.data();

  if (
    purpose ===
    "board_entry"
  ) {
    if (!actorUserId) {
      throw new HttpsError(
        "unauthenticated",
        "Authentication is required to pay a Board Entry fee.",
      );
    }

    if (
      normalizeString(
        entry?.submittedByUserId,
      ) !== actorUserId
    ) {
      throw new HttpsError(
        "permission-denied",
        "Only the Listing creator can pay this Board Entry fee.",
      );
    }

    if (
      entry?.status !==
      "pending_payment"
    ) {
      throw new HttpsError(
        "failed-precondition",
        "This Board Entry is not awaiting payment.",
      );
    }

    const boardStatus =
      normalizeString(
        board?.status,
      );

    if (
      [
        "expired",
        "archived",
        "cancelled",
        "rejected",
      ].includes(
        boardStatus,
      )
    ) {
      throw new HttpsError(
        "failed-precondition",
        "This Board is closed.",
      );
    }

    const entryStartsAt =
      new Date(
        String(
          board?.entryStartsAt ||
          "",
        ),
      ).getTime();

    const entryClosesAt =
      new Date(
        String(
          board?.entryClosesAt ||
          "",
        ),
      ).getTime();

    const endsAt =
      new Date(
        String(
          board?.endsAt ||
          "",
        ),
      ).getTime();

    if (
      Number.isNaN(
        entryStartsAt,
      ) ||
      Number.isNaN(
        entryClosesAt,
      ) ||
      Number.isNaN(
        endsAt,
      )
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Board dates are invalid.",
      );
    }

    const nowMs =
      Date.now();

    if (
      nowMs <
        entryStartsAt ||
      nowMs >=
        entryClosesAt ||
      nowMs >=
        endsAt
    ) {
      throw new HttpsError(
        "failed-precondition",
        "The Board entry payment window is closed.",
      );
    }

    const expectedAmount =
      Number(
        board?.entryFeeMinor,
      );

    if (
      amountMinor !==
      expectedAmount
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Board Entry fee does not match the Board.",
      );
    }

    return {
      purpose,
      targetKind,
      targetId,
      amountMinor,
      currency,
      description:
        description ||
        `Board Entry payment`,
      boardId,
      listingId,
    };
  }

  if (
    entry?.status !==
    "entered"
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Only entered Board listings can be pushed.",
    );
  }

  /* BEGIN VIEWBID BOARD PUSH WINDOW HARDENING V1 */

  const boardStatus =
    normalizeString(
      board?.status,
    );

  if (
    [
      "expired",
      "archived",
      "cancelled",
      "rejected",
    ].includes(
      boardStatus,
    )
  ) {
    throw new HttpsError(
      "failed-precondition",
      "This Board is closed.",
    );
  }

  const boardStartsAt =
    new Date(
      String(
        board?.startsAt ||
        "",
      ),
    ).getTime();

  const boardEndsAt =
    new Date(
      String(
        board?.endsAt ||
        "",
      ),
    ).getTime();

  if (
    Number.isNaN(
      boardStartsAt,
    ) ||
    Number.isNaN(
      boardEndsAt,
    )
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Board dates are invalid.",
    );
  }

  if (
    Date.now() <
    boardStartsAt
  ) {
    throw new HttpsError(
      "failed-precondition",
      "This Board has not started.",
    );
  }

  if (
    Date.now() >=
    boardEndsAt
  ) {
    throw new HttpsError(
      "failed-precondition",
      "This Board has ended.",
    );
  }

  /* END VIEWBID BOARD PUSH WINDOW HARDENING V1 */

  const minimumBoostMinor =
    Number(
      board?.minimumBoostMinor,
    );

  if (
    !Number.isSafeInteger(
      minimumBoostMinor,
    ) ||
    amountMinor <
      minimumBoostMinor
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Push Up amount is below the Board minimum.",
    );
  }

  return {
    purpose,
    targetKind,
    targetId,
    amountMinor,
    currency,
    description:
      description ||
      "Board listing Push Up",
    boardId,
    listingId,
  };
}

export async function fulfillVerifiedPayment(
  db: Firestore,
  paymentIntentId: string,
  providerPaymentId: string,
) {
  const paymentRef =
    db
      .collection(
        "paymentIntents",
      )
      .doc(paymentIntentId);

  await db.runTransaction(
    async (transaction) => {
      const paymentSnap =
        await transaction.get(
          paymentRef,
        );

      if (!paymentSnap.exists) {
        throw new Error(
          "Payment intent not found.",
        );
      }

      const payment =
        paymentSnap.data();

      if (
        payment?.fulfilledAt
      ) {
        return;
      }

      const purpose =
        String(
          payment?.purpose ||
          "",
        ) as PaymentPurpose;

      const targetId =
        String(
          payment?.targetId ||
          "",
        );

      const amountMinor =
        Number(
          payment?.amountMinor,
        );

      if (
        purpose ===
        "listing_submission"
      ) {
        const listingRef =
          db
            .collection(
              "listings",
            )
            .doc(targetId);

        const listingSnap =
          await transaction.get(
            listingRef,
          );

        if (!listingSnap.exists) {
          throw new Error(
            "Listing not found during submission payment fulfillment.",
          );
        }

        const listing =
          listingSnap.data();

        if (
          listing?.status !==
          "payment_pending"
        ) {
          throw new Error(
            "Listing is no longer awaiting submission payment.",
          );
        }

        if (
          Number(
            listing?.submissionFeeMinor,
          ) !== amountMinor
        ) {
          throw new Error(
            "Listing submission amount changed before fulfillment.",
          );
        }

        transaction.update(
          listingRef,
          {
            status:
              "submitted",
            submissionPaymentStatus:
              "paid",
            submissionPaymentId:
              providerPaymentId,
            updatedAt:
              FieldValue.serverTimestamp(),
          },
        );
      } else if (
        purpose ===
        "board_activation"
      ) {
        const boardRef =
          db
            .collection(
              "boards",
            )
            .doc(targetId);

        const boardSnap =
          await transaction.get(
            boardRef,
          );

        if (!boardSnap.exists) {
          throw new Error(
            "Board not found during activation payment fulfillment.",
          );
        }

        const board =
          boardSnap.data();

        if (
          board?.status !==
          "awaiting_activation_payment"
        ) {
          throw new Error(
            "Board is no longer awaiting activation payment.",
          );
        }

        if (
          Number(
            board?.activationFeeMinor,
          ) !== amountMinor
        ) {
          throw new Error(
            "Board activation amount changed before fulfillment.",
          );
        }

        const entryClosesAt =
          new Date(
            String(
              board?.entryClosesAt ||
              "",
            ),
          ).getTime();

        const endsAt =
          new Date(
            String(
              board?.endsAt ||
              "",
            ),
          ).getTime();

        if (
          Number.isNaN(
            entryClosesAt,
          ) ||
          Number.isNaN(
            endsAt,
          ) ||
          Date.now() >=
            entryClosesAt ||
          Date.now() >=
            endsAt
        ) {
          throw new Error(
            "Board activation window is closed.",
          );
        }

        transaction.update(
          boardRef,
          {
            status:
              "approved",
            activationPaymentStatus:
              "paid",
            activationPaymentId:
              providerPaymentId,
            activatedAt:
              FieldValue.serverTimestamp(),
            updatedAt:
              FieldValue.serverTimestamp(),
          },
        );
      } else if (
        purpose ===
        "listing_push"
      ) {
        const listingRef =
          db
            .collection(
              "listings",
            )
            .doc(targetId);

        const listingSnap =
          await transaction.get(
            listingRef,
          );

        if (!listingSnap.exists) {
          throw new Error(
            "Listing not found during payment fulfillment.",
          );
        }

        const listing =
          listingSnap.data();

        const now =
          new Date();

        const weekKey =
          getUtcWeekKey(now);

        const monthKey =
          getUtcMonthKey(now);

        const weeklyBoostTotalMinor =
          String(
            listing?.weeklyBoostKey ||
            "",
          ) === weekKey
            ? Number(
                listing?.weeklyBoostTotalMinor ||
                0,
              ) + amountMinor
            : amountMinor;

        const monthlyBoostTotalMinor =
          String(
            listing?.monthlyBoostKey ||
            "",
          ) === monthKey
            ? Number(
                listing?.monthlyBoostTotalMinor ||
                0,
              ) + amountMinor
            : amountMinor;

        transaction.update(
          listingRef,
          {
            currentBoostTotalMinor:
              FieldValue.increment(
                amountMinor,
              ),

            weeklyBoostKey:
              weekKey,

            weeklyBoostTotalMinor,

            monthlyBoostKey:
              monthKey,

            monthlyBoostTotalMinor,

            updatedAt:
              FieldValue.serverTimestamp(),
          },
        );
      } else if (
        purpose ===
        "board_entry"
      ) {
        const entryRef =
          db
            .collection(
              "boardEntries",
            )
            .doc(targetId);

        const entrySnap =
          await transaction.get(
            entryRef,
          );

        if (!entrySnap.exists) {
          throw new Error(
            "Board Entry not found during payment fulfillment.",
          );
        }

        const entry =
          entrySnap.data();

        if (
          entry?.status !==
          "pending_payment"
        ) {
          throw new Error(
            "Board Entry is no longer awaiting payment.",
          );
        }

        const boardId =
          normalizeString(
            entry?.boardId,
          );

        if (!boardId) {
          throw new Error(
            "Board Entry is missing boardId.",
          );
        }

        const boardRef =
          db
            .collection(
              "boards",
            )
            .doc(boardId);

        const boardSnap =
          await transaction.get(
            boardRef,
          );

        if (!boardSnap.exists) {
          throw new Error(
            "Board not found during entry payment fulfillment.",
          );
        }

        const board =
          boardSnap.data();

        const entryStartsAt =
          new Date(
            String(
              board?.entryStartsAt ||
              "",
            ),
          ).getTime();

        const entryClosesAt =
          new Date(
            String(
              board?.entryClosesAt ||
              "",
            ),
          ).getTime();

        const endsAt =
          new Date(
            String(
              board?.endsAt ||
              "",
            ),
          ).getTime();

        const nowMs =
          Date.now();

        if (
          Number.isNaN(
            entryStartsAt,
          ) ||
          Number.isNaN(
            entryClosesAt,
          ) ||
          Number.isNaN(
            endsAt,
          ) ||
          nowMs <
            entryStartsAt ||
          nowMs >=
            entryClosesAt ||
          nowMs >=
            endsAt
        ) {
          throw new Error(
            "Board Entry payment window is closed.",
          );
        }

        transaction.update(
          entryRef,
          {
            status:
              "entered",
            entryPaymentId:
              providerPaymentId,
            approvedAt:
              FieldValue.serverTimestamp(),
            updatedAt:
              FieldValue.serverTimestamp(),
          },
        );
      } else if (
        purpose ===
        "board_entry_push"
      ) {
        const entryRef =
          db
            .collection(
              "boardEntries",
            )
            .doc(targetId);

        const entrySnap =
          await transaction.get(
            entryRef,
          );

        if (!entrySnap.exists) {
          throw new Error(
            "Board Entry not found during Push Up fulfillment.",
          );
        }

        const entry =
          entrySnap.data();

        if (
          entry?.status !==
          "entered"
        ) {
          throw new Error(
            "Board Entry is no longer active.",
          );
        }

        const boardId =
          normalizeString(
            entry?.boardId,
          );

        if (!boardId) {
          throw new Error(
            "Board Entry is missing boardId.",
          );
        }

        const boardRef =
          db
            .collection(
              "boards",
            )
            .doc(boardId);

        const boardSnap =
          await transaction.get(
            boardRef,
          );

        if (!boardSnap.exists) {
          throw new Error(
            "Board not found during Push Up fulfillment.",
          );
        }

        const board =
          boardSnap.data();

        const startsAt =
          new Date(
            String(
              board?.startsAt ||
              "",
            ),
          ).getTime();

        const endsAt =
          new Date(
            String(
              board?.endsAt ||
              "",
            ),
          ).getTime();

        if (
          Number.isNaN(
            startsAt,
          ) ||
          Number.isNaN(
            endsAt,
          ) ||
          Date.now() <
            startsAt ||
          Date.now() >=
            endsAt
        ) {
          throw new Error(
            "Board Push Up window is closed.",
          );
        }

        transaction.update(
          entryRef,
          {
            boostTotalMinor:
              FieldValue.increment(
                amountMinor,
              ),
            supporterCount:
              FieldValue.increment(
                1,
              ),
            updatedAt:
              FieldValue.serverTimestamp(),
          },
        );
      } else {
        throw new Error(
          "Unsupported payment purpose.",
        );
      }

      transaction.update(
        paymentRef,
        {
          status:
            "paid",
          providerPaymentId,
          verifiedAt:
            FieldValue.serverTimestamp(),
          fulfilledAt:
            FieldValue.serverTimestamp(),
          updatedAt:
            FieldValue.serverTimestamp(),
        },
      );
    },
  );
}
