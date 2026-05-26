import { faker } from "../config/faker.js";
import { STABLE_CLIENT_ACCOUNTS } from "../config/constants.js";
import { Role, UserStatus } from "../../src/generated/prisma/client.js";
import { validateClientSeed } from "../factories/client.factory.js";
import { generateMaleName, generateEgyptianPhone } from "../helpers/male-data.js";

function generateFakeClients(count = 8) {
  return Array.from({ length: count }, () => {
    return validateClientSeed({
      name: generateMaleName(),
      email: faker.internet.email(),
      password: "12345678",
      phone: generateEgyptianPhone(),
      role: Role.client,
      status: UserStatus.ACTIVE,
    });
  });
}

export function getSeedClients() {
  return [...STABLE_CLIENT_ACCOUNTS.map(validateClientSeed), ...generateFakeClients()];
}
