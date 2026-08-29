import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import {
  firebaseApp,
  useFirebaseEmulators,
} from "../../config/firebase";

import type {
  EmulatorPaymentCompletionResult,
  PaymentIntentResult,
  PaymentRequest,
} from "../../features/payment/types";

const functions =
  getFunctions(
    firebaseApp,
    "asia-south1",
  );

/* BEGIN VIEWBID FUNCTIONS EMULATOR WIRING V1 */

if (useFirebaseEmulators) {
  connectFunctionsEmulator(
    functions,
    "127.0.0.1",
    5001,
  );
}

/* END VIEWBID FUNCTIONS EMULATOR WIRING V1 */
const completeEmulatorPaymentCallable =
  httpsCallable<
    {
      paymentIntentId: string;
    },
    EmulatorPaymentCompletionResult
  >(
    functions,
    "completeEmulatorPayment",
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

export async function completeEmulatorPayment(
  paymentIntentId: string,
): Promise<EmulatorPaymentCompletionResult> {
  const result =
    await completeEmulatorPaymentCallable({
      paymentIntentId,
    });

  return result.data;
}
