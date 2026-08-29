import {
  FieldValue,
  type Firestore,
} from "firebase-admin/firestore";

import {
  HttpsError,
} from "firebase-functions/v2/https";

export type PaymentPurpose =
  | "listing_push"
  | "board_entry"
  | "board_entry_push";

export type PaymentTargetKind =
  | "listing"
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

const publicListingPricing:
  Record<
    string,
    {
      minimumBoostMinor: number;
      boostingEnabled: boolean;
    }
  > = {
    youtube: {
      minimumBoostMinor: 100,
      boostingEnabled: true,
    },

    facebook: {
      minimumBoostMinor: 100,
      boostingEnabled: true,
    },

    instagram: {
      minimumBoostMinor: 100,
      boostingEnabled: true,
    },

    x: {
      minimumBoostMinor: 100,
      boostingEnabled: true,
    },

    app: {
      minimumBoostMinor: 100,
      boostingEnabled: true,
    },

    startup: {
      minimumBoostMinor: 100,
      boostingEnabled: true,
    },

    website: {
      minimumBoostMinor: 100,
      boostingEnabled: true,
    },

    other: {
      minimumBoostMinor: 100,
      boostingEnabled: true,
    },
  };

function getPublicListingPricing(
  listingTypeId: unknown,
) {
  const typeId =
    normalizeString(
      listingTypeId,
    );

  const pricing =
    publicListingPricing[
      typeId
    ];

  if (
    !pricing ||
    !pricing.boostingEnabled
  ) {
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
    amountMinor > 10000000
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
      "listing_push",
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
      getPublicListingPricing(
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
