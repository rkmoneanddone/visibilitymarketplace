import type {
  MarketplaceUser,
} from "../../types/user";

import {
  isAdmin,
} from "../../lib/auth/roles";

export function assertAdminAccess(
  profile:
    | MarketplaceUser
    | null
    | undefined,
): void {
  if (!isAdmin(profile)) {
    throw new Error(
      "Admin access required.",
    );
  }
}