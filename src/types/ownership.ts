export type OwnershipClaimStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "cancelled";

export interface OwnershipClaim {
  id: string;

  listingId: string;
  requestedByUserId: string;

  status: OwnershipClaimStatus;

  verificationMethod?: string;
  verificationReference?: string;

  createdAt: string;
  updatedAt: string;

  verifiedAt?: string;
  rejectedAt?: string;
}