import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import {
  firebaseApp,
} from "../../config/firebase";

import type {
  PaymentIntentResult,
  PaymentRequest,
} from "../../features/payment/types";

const functions =
  getFunctions(
    firebaseApp,
    "asia-south1",
  );

const createPaymentIntentCallable =
  httpsCallable<
    Omit<
      PaymentRequest,
      "title"
    >,
    PaymentIntentResult
  >(
    functions,
    "createPaymentIntent",
  );

export async function createPaymentIntent(
  request: PaymentRequest,
): Promise<PaymentIntentResult> {
  const result =
    await createPaymentIntentCallable({
      purpose:
        request.purpose,

      targetKind:
        request.targetKind,

      targetId:
        request.targetId,

      amountMinor:
        request.amountMinor,

      currency:
        request.currency,

      description:
        request.description,
    });

  return result.data;
}
