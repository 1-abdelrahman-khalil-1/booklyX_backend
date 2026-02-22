import { Platform, Role } from "../../generated/prisma/client.js";

export function isPlatformAllowedForRole(
  role: Role,
  platform: Platform,
): boolean {
  if (role === Role.client) {
    return platform === Platform.APP || platform === Platform.WEB;
  }

  if (role === Role.staff) {
    return platform === Platform.APP;
  }

  if (role === Role.branch_admin || role === Role.super_admin) {
    return platform === Platform.WEB;
  }

  return false;
}
