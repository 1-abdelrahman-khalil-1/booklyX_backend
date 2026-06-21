import { ASSETS } from "../config/assets.js";
import { BusinessCategory, StaffRole } from "../../src/generated/prisma/client.js";

export function pickRandom(arr, seed = 0) {
  if (!arr?.length) return null;

  return arr[seed % arr.length];
}

export function getStaffProfileImage(role, index = 0) {
  let pool;
  switch (role) {
    case StaffRole.DOCTOR:
      pool = ASSETS.profileImages.doctors;
      break;
    case StaffRole.BARBER:
      pool = ASSETS.profileImages.barbers;
      break;
    case StaffRole.SPA_SPECIALIST:
      pool = ASSETS.profileImages.spa;
      break;
    default:
      pool = ASSETS.profileImages.spa;
  }
  return pool[index % pool.length];
}

export function getClientProfileImage(index = 0) {
  const pool = ASSETS.profileImages.clients;
  return pool[index % pool.length];
}

export function getBranchDocumentUrl() {
  return pickRandom(ASSETS.certificates);
}

export function getBranchProfileImage(category, index = 0) {
  switch (category) {
    case BusinessCategory.BARBER:
      return ASSETS.businessImages.barber[index % ASSETS.businessImages.barber.length];
    case BusinessCategory.CLINIC:
      return ASSETS.businessImages.medical[index % ASSETS.businessImages.medical.length];
    case BusinessCategory.SPA:
      return ASSETS.businessImages.spa[index % ASSETS.businessImages.spa.length];
    default:
      return pickRandom(ASSETS.businessImages.spa, index);
  }
}

export function getServiceImage(category, index = 0) {
  switch (category) {
    case BusinessCategory.BARBER:
      return ASSETS.serviceImages.barber[index % ASSETS.serviceImages.barber.length];
    case BusinessCategory.CLINIC:
      return ASSETS.serviceImages.medical[index % ASSETS.serviceImages.medical.length];
    case BusinessCategory.SPA:
      return ASSETS.serviceImages.spa[index % ASSETS.serviceImages.spa.length];
    default:
      return pickRandom(ASSETS.serviceImages.spa, index);
  }
}

export function getExecutionAttachment(category, index = 0) {
  switch (category) {
    case BusinessCategory.BARBER:
      return ASSETS.executionAttachments.barber[
        index % ASSETS.executionAttachments.barber.length
      ];
    case BusinessCategory.CLINIC:
      return ASSETS.executionAttachments.medical[
        index % ASSETS.executionAttachments.medical.length
      ];
    case BusinessCategory.SPA:
      return ASSETS.executionAttachments.spa[
        index % ASSETS.executionAttachments.spa.length
      ];
    default:
      return pickRandom(ASSETS.executionAttachments.spa, index);
  }
}
