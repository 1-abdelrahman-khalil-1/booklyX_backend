import prisma from "../../lib/prisma.js";
import { StaffNotFoundError } from "./errors.js";

export async function getStaffIdByUserId(userId) {
  const staff = await prisma.staff.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!staff) {
    throw new StaffNotFoundError();
  }

  return staff.id;
}
