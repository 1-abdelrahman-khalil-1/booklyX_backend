import { faker } from "../config/faker.js";
import { STAFF_ROLE_POOL, STABLE_INITIAL_STAFF } from "../config/constants.js";
import { BranchStatus, Role, UserStatus } from "../../src/generated/prisma/client.js";
import { getStaffProfileImage } from "../helpers/random.js";
import { validateStaffSeed, validateStaffUserSeed } from "../factories/staff.factory.js";
import { generateMaleName, generateEgyptianPhone } from "../helpers/male-data.js";

function generateFakeInitialStaff(count = 3) {
  return Array.from({ length: count }, () => {
    return validateStaffUserSeed({
      name: generateMaleName(),
      email: faker.internet.email(),
      password: "12345678",
      phone: generateEgyptianPhone(),
      age: faker.number.int({ min: 20, max: 50 }),
      role: Role.staff,
      status: UserStatus.ACTIVE,
    });
  });
}

export function getSeedInitialStaffUsers() {
  return [
    ...STABLE_INITIAL_STAFF.map(validateStaffUserSeed),
    ...generateFakeInitialStaff(),
  ];
}

export function getSeedStaff(branchSubmissions, count = 8) {
  const approvedBranchEmails = branchSubmissions
    .filter((branch) => branch.status === BranchStatus.APPROVED)
    .map((branch) => branch.email);

  if (approvedBranchEmails.length === 0) {
    throw new Error("No approved branches available to assign staff.");
  }

  return Array.from({ length: count }, (_, index) => {
    const staffRole = STAFF_ROLE_POOL[index % STAFF_ROLE_POOL.length];
    const branchEmail = approvedBranchEmails[index % approvedBranchEmails.length];

    return validateStaffSeed({
      name: generateMaleName(),
      email: faker.internet.email(),
      phone: generateEgyptianPhone(),
      password: "12345678",
      age: faker.number.int({ min: 20, max: 50 }),
      startDateOffsetDays: faker.number.int({ min: 30, max: 150 }),
      profileImageUrl: getStaffProfileImage(staffRole, index),
      staffRole,
      commissionPercentage: faker.number.float({ min: 15, max: 30, precision: 0.5 }),
      branchEmail,
    });
  });
}
