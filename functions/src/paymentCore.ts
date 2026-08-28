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

    if (amountMinor < 100) {
      throw new HttpsError(
        "invalid-argument",
        "Minimum Push Up is $1.",
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

  const boardEndsAt =
    new Date(
      String(
        board?.endsAt ||
        "",
      ),
    ).getTime();

  if (
    Number.isNaN(
      boardEndsAt,
    ) ||
    Date.now() >=
      boardEndsAt
  ) {
    throw new HttpsError(
      "failed-precondition",
      "This Board has ended.",
    );
  }

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

        transaction.update(
          listingRef,
          {
            currentBoostTotalMinor:
              FieldValue.increment(
                amountMinor,
              ),
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
