import { z } from "zod";
import {
  BranchStatus,
  BusinessCategory,
} from "../../src/generated/prisma/client.js";
import { validateSeedData } from "../helpers/validation.js";

const branchSchema = z.object({
  ownerName: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().regex(/^0\d{10}$/),
  password: z.string().min(8).max(128),
  businessName: z.string().min(1).max(160),
  category: z.nativeEnum(BusinessCategory),
  description: z.string().min(1).max(500),
  commercialRegisterNumber: z.string().min(4).max(40),
  taxId: z.string().min(4).max(40),
  city: z.string().min(1).max(80),
  district: z.string().min(1).max(80),
  address: z.string().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  status: z.nativeEnum(BranchStatus),
  rejectionReason: z.string().max(500).nullable(),
});

export function validateBranchSeed(data) {
  return validateSeedData(branchSchema, data, "BranchSeed");
}
