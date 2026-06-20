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

export function buildStaffAppointmentListSelect() {
  return {
    id: true,
    client: {
      select: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    },
    service: {
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        durationMinutes: true,
      },
    },
    scheduledAt: true,
    status: true,
  };
}

export function buildStaffAppointmentDetailsSelect() {
  return {
    id: true,
    staffId: true,
    client: {
      select: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    },
    service: {
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        durationMinutes: true,
      },
    },
    scheduledAt: true,
    status: true,
  };
}

