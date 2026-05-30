import dayjs from "dayjs";
import { AppointmentStatus, AvailabilityStatus, ServiceApprovalStatus } from "../../../generated/prisma/client.js";
import { tr } from "../../../lib/i18n/index.js";
import prisma from "../../../lib/prisma.js";
import { AppError } from "../../../utils/AppError.js";
import {
    AvailabilityAccessError,
    AvailabilityNotFoundError,
    DuplicateAvailabilityError,
} from "../errors.js";
import { getStaffIdByUserId } from "../helpers.js";

export async function listStaffAvailability(userId) {
  const staffId = await getStaffIdByUserId(userId);

  const availabilities = await prisma.staffAvailability.findMany({
    where: { staffId, status: AvailabilityStatus.AVAILABLE },
    orderBy: { dayOfWeek: "asc" },
    select: {
      id: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
    },
  });

  return availabilities;
}

export async function createStaffAvailability(userId, data) {
  const staffId = await getStaffIdByUserId(userId);

  const existing = await prisma.staffAvailability.findUnique({
    where: {
      staffId_dayOfWeek: {
        staffId,
        dayOfWeek: data.dayOfWeek,
      },
    },
  });

  if (existing) {
    throw new DuplicateAvailabilityError();
  }

  const availability = await prisma.staffAvailability.create({
    data: {
      staffId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
    },
    select: {
      id: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      status: true,
    },
  });

  return availability;
}

export async function updateStaffAvailability(userId, availabilityId, data) {
  const staffId = await getStaffIdByUserId(userId);
  const availability = await prisma.staffAvailability.findUnique({
    where: { id: availabilityId },
    select: {
      id: true,
      staffId: true,
    },
  });

  if (!availability) {
    throw new AvailabilityNotFoundError();
  }

  if (availability.staffId !== staffId) {
    throw new AvailabilityAccessError();
  }

  if (data.dayOfWeek !== undefined) {
    const existing = await prisma.staffAvailability.findFirst({
      where: {
        staffId,
        dayOfWeek: data.dayOfWeek,
        id: { not: availabilityId },
      },
    });

    if (existing) {
      throw new DuplicateAvailabilityError();
    }
  }

  const updated = await prisma.staffAvailability.update({
    where: { id: availabilityId },
    data: {
      ...(data.dayOfWeek !== undefined && { dayOfWeek: data.dayOfWeek }),
      ...(data.startTime && { startTime: data.startTime }),
      ...(data.endTime && { endTime: data.endTime }),
    },
    select: {
      id: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      status: true,
    },
  });

  return updated;
}

export async function deleteStaffAvailability(userId, availabilityId) {
  const staffId = await getStaffIdByUserId(userId);
  const availability = await prisma.staffAvailability.findUnique({
    where: { id: availabilityId },
    select: {
      id: true,
      staffId: true,
    },
  });

  if (!availability) {
    throw new AvailabilityNotFoundError();
  }

  if (availability.staffId !== staffId) {
    throw new AvailabilityAccessError();
  }

  await prisma.staffAvailability.delete({
    where: { id: availabilityId },
  });

  return { id: availabilityId };
}

export async function getAvailableSlots(userId, dateStr, serviceId) {
  const staff = await prisma.staff.findUnique({
    where: { userId },
    select: {
      id: true,
      branchId: true,
    },
  });

  if (!staff) {
    throw new AppError(tr.STAFF_NOT_FOUND, 404);
  }
  const staffId = staff.id;

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: {
      id: true,
      durationMinutes: true,
      status: true,
      branchId: true,
    },
  });

  if (!service || service.status !== ServiceApprovalStatus.APPROVED) {
    throw new AppError(tr.SERVICE_NOT_FOUND, 404);
  }

  if (service.branchId !== staff.branchId) {
    throw new AppError(tr.SERVICE_NOT_FOUND, 404);
  }

  const targetDate = dayjs(dateStr).toDate();
  const dayOfWeek = dayjs(targetDate).day();

  const availability = await prisma.staffAvailability.findUnique({
    where: {
      staffId_dayOfWeek: {
        staffId,
        dayOfWeek,
      },
    },
  });

  if (!availability || availability.status === AvailabilityStatus.UNAVAILABLE) {
    return {
      date: dateStr,
      serviceId,
      slots: [],
      available: false,
    };
  }

  const [availableHourStart, availableMinStart] = availability.startTime.split(":").map(Number);
  const [availableHourEnd, availableMinEnd] = availability.endTime.split(":").map(Number);
  if (
    availableHourStart === undefined ||
    availableMinStart === undefined ||
    availableHourEnd === undefined ||
    availableMinEnd === undefined
  ) {
    throw new AppError(tr.STAFF_TIME_FORMAT_INVALID, 400);
  }

  let dayStart = dayjs(targetDate).hour(availableHourStart).minute(availableMinStart).toDate();
  const dayEnd = dayjs(targetDate).hour(availableHourEnd).minute(availableMinEnd).toDate();

  const now = new Date();
  if (dayStart < now) {
    dayStart = now;
  }

  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      staffId,
      status: {
        in: [AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS],
      },
      scheduledAt: {
        gte: dayjs(targetDate).startOf("day").toDate(),
        lte: dayjs(targetDate).endOf("day").toDate(),
      },
    },
    select: {
      scheduledAt: true,
      service: {
        select: {
          durationMinutes: true,
        },
      },
    },
  });

  const slots = [];
  let currentTime = dayStart;

  while (currentTime.getTime() + service.durationMinutes * 60 * 1000 <= dayEnd.getTime()) {
    const slotEnd = dayjs(currentTime).add(service.durationMinutes, "minute").toDate();
    const isBooked = bookedAppointments.some((apt) => {
      const aptStart = apt.scheduledAt;
      const aptEnd = dayjs(aptStart).add(apt.service.durationMinutes, "minute").toDate();
      return !(slotEnd <= aptStart || currentTime >= aptEnd);
    });

    if (!isBooked) {
      slots.push({
        startTime: currentTime.toISOString(),
        endTime: slotEnd.toISOString(),
      });
    }

    currentTime = slotEnd;
  }

  return {
    date: dateStr,
    serviceId,
    slots,
    available: slots.length > 0,
  };
}
