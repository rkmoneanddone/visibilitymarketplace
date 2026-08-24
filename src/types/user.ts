export type UserRole =
  | "supporter"
  | "publisher"
  | "admin";

export interface MarketplaceUser {
  uid: string;

  email: string | null;
  displayName: string | null;
  photoURL: string | null;

  role: UserRole;

  createdAt: string;
  updatedAt: string;
}