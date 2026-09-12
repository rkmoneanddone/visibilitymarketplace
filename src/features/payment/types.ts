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

export type PaymentRequest = {
  purpose: PaymentPurpose;
  targetKind: PaymentTargetKind;
  targetId: string;

  amountMinor: number;
  currency: string;

  title: string;
  description?: string;
};

export type PaymentIntentResult = {
  success: boolean;

  paymentIntentId: string;

  status:
    | "created"
    | "checkout_ready";

  providerReady: boolean;

  checkoutUrl: string | null;
};

export type EmulatorPaymentCompletionResult = {
  success: boolean;

  paymentIntentId: string;

  status: "paid";

  alreadyFulfilled: boolean;
};

export type PaymentStatus = {
  paymentIntentId: string;
  status: string;
  purpose: PaymentPurpose | string;
  amountMinor: number;
  currency: string;
  refundStatus: string | null;
  fulfilled: boolean;
  message: string;
};

export type PaymentStatusResult = {
  success: boolean;
  payment: PaymentStatus;
};
