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

  status: "created";

  providerReady: boolean;

  checkoutUrl: string | null;
};

export type EmulatorPaymentCompletionResult = {
  success: boolean;

  paymentIntentId: string;

  status: "paid";

  alreadyFulfilled: boolean;
};
