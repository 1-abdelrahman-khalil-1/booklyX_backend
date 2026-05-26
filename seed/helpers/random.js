import { ASSETS } from "../config/assets.js";
import { BusinessCategory, StaffRole } from "../../src/generated/prisma/client.js";

export function pickRandom(arr, seed = 0) {
  if (!arr?.length) return null;

  return arr[seed % arr.length];
}

export function getStaffProfileImage(role, index = 0) {
  switch (role) {
    case StaffRole.DOCTOR:
      return ASSETS.profileImages.doctors[index % ASSETS.profileImages.doctors.length];
    case StaffRole.BARBER:
      return ASSETS.profileImages.barbers[index % ASSETS.profileImages.barbers.length];
    case StaffRole.SPA_SPECIALIST:
      return ASSETS.profileImages.spa[index % ASSETS.profileImages.spa.length];
    default:
      return pickRandom(ASSETS.profileImages.spa, index);
  }
}

export function getBranchDocumentUrl() {
  return pickRandom(ASSETS.certificates);
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
