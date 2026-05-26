import { faker } from "../config/faker.js";
import {
  BUSINESS_CATEGORIES,
  STABLE_BRANCH_ADMINS,
} from "../config/constants.js";
import { BranchStatus } from "../../src/generated/prisma/client.js";
import { validateBranchSeed } from "../factories/branch.factory.js";
import { generateMaleName, generateEgyptianPhone } from "../helpers/male-data.js";

function generateFakeBranchSubmissions(count = 10) {
  const cityPool = [
    "Cairo",
    "Giza",
    "Alexandria",
    "Mansoura",
    "Tanta",
    "Aswan",
    "Luxor",
  ];
  const districtPool = [
    "Nasr City",
    "Dokki",
    "Heliopolis",
    "Maadi",
    "Zamalek",
    "Mohandiseen",
    "6th October City",
  ];
  const statuses = [
    BranchStatus.PENDING_VERIFICATION,
    BranchStatus.PENDING_APPROVAL,
    BranchStatus.APPROVED,
    BranchStatus.REJECTED,
  ];

  return Array.from({ length: count }, (_, index) => {
    const status = statuses[index % statuses.length];
    const rejectionReason =
      status === BranchStatus.REJECTED ? faker.lorem.sentence() : null;

    return validateBranchSeed({
      ownerName: generateMaleName(),
      email: faker.internet.email(),
      phone: generateEgyptianPhone(),
      password: "12345678",
      businessName:
        faker.company.name() + (faker.datatype.boolean() ? " Wellness" : " Care"),
      category: BUSINESS_CATEGORIES[index % BUSINESS_CATEGORIES.length],
      description: faker.lorem.sentence(),
      commercialRegisterNumber: `CR-${faker.string.alphanumeric(8).toUpperCase()}`,
      taxId: `TAX-${faker.string.alphanumeric(8).toUpperCase()}`,
      city: cityPool[index % cityPool.length],
      district: districtPool[index % districtPool.length],
      address: faker.location.streetAddress(),
      latitude: faker.number.float({ min: 29.95, max: 31.95, precision: 0.0001 }),
      longitude: faker.number.float({ min: 31.0, max: 32.0, precision: 0.0001 }),
      status,
      rejectionReason,
    });
  });
}

export function getSeedBranchSubmissions() {
  return [
    ...STABLE_BRANCH_ADMINS.map(validateBranchSeed),
    ...generateFakeBranchSubmissions(),
  ];
}
