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
  PaymentStatusResult,
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

const createEmulatorPaymentIntentCallable =
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

const createDodoPaymentIntentCallable =
  httpsCallable<
    Omit<
      PaymentRequest,
      "title"
    >,
    PaymentIntentResult
  >(
    functions,
    "createDodoPaymentIntent",
  );

const getPaymentStatusCallable =
  httpsCallable<
    {
      paymentIntentId: string;
      clientStatusToken: string;
    },
    PaymentStatusResult
  >(
    functions,
    "getPaymentStatus",
  );

export async function createPaymentIntent(
  request: PaymentRequest,
): Promise<PaymentIntentResult> {
  const callable =
    useFirebaseEmulators
      ? createEmulatorPaymentIntentCallable
      : createDodoPaymentIntentCallable;

  const result =
    await callable({
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

export async function getPaymentStatus(
  paymentIntentId: string,
  clientStatusToken: string,
): Promise<PaymentStatusResult> {
  const result =
    await getPaymentStatusCallable({
      paymentIntentId,
      clientStatusToken,
    });

  return result.data;
}
