import { z } from "zod";
import { Role, StaffRole, UserStatus } from "../../src/generated/prisma/client.js";
import { validateSeedData } from "../helpers/validation.js";

const staffUserSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  phone: z.string().regex(/^0\d{10}$/),
  age: z.number().int().min(18).max(70),
  role: z.literal(Role.staff),
  status: z.nativeEnum(UserStatus),
});

const staffSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().regex(/^0\d{10}$/),
  password: z.string().min(8).max(128),
  age: z.number().int().min(18).max(70),
  startDateOffsetDays: z.number().int().min(0).max(365),
  profileImageUrl: z.string().url(),
  staffRole: z.nativeEnum(StaffRole),
  commissionPercentage: z.number().min(0).max(100),
  branchEmail: z.string().email(),
});

export function validateStaffUserSeed(data) {
  return validateSeedData(staffUserSchema, data, "StaffUserSeed");
}

export function validateStaffSeed(data) {
  return validateSeedData(staffSchema, data, "StaffSeed");
}
