import { z } from "zod";
import { Role, UserStatus } from "../../src/generated/prisma/client.js";
import { validateSeedData } from "../helpers/validation.js";

const clientSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  phone: z.string().regex(/^0\d{10}$/),
  role: z.literal(Role.client),
  status: z.nativeEnum(UserStatus),
});

export function validateClientSeed(data) {
  return validateSeedData(clientSchema, data, "ClientSeed");
}
