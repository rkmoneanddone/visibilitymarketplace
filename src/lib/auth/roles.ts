import type {
  MarketplaceUser,
} from "../../types/user";

export function isAdmin(
  profile:
    | MarketplaceUser
    | null
    | undefined,
): boolean {
  return profile?.role === "admin";
}