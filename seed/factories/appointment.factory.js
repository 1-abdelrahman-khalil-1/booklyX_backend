import { z } from "zod";
import { AppointmentStatus } from "../../src/generated/prisma/client.js";
import { validateSeedData } from "../helpers/validation.js";

const appointmentSchema = z.object({
  clientId: z.number().int().positive(),
  staffId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  scheduledAt: z.date(),
  status: z.nativeEnum(AppointmentStatus),
});

export function validateAppointmentSeed(data) {
  return validateSeedData(appointmentSchema, data, "AppointmentSeed");
}
