export type PaymentPurpose =
  | "listing_push"
  | "board_entry"
  | "board_entry_push";

export type PaymentTargetKind =
  | "listing"
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
