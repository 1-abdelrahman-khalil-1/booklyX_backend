import { AvailabilityStatus, ServiceApprovalStatus } from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import dayjs from "dayjs";
import { mapStaffPublicProfile } from "../../../lib/mappers/profile.mapper.js";
import { StaffNotFoundError, ServiceNotFoundError } from "../errors.js";
import { buildStaffUserSelect } from "../helpers.js";

export async function getServiceStaff(serviceId) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, status: true, branchId: true },
  });

  if (!service || service.status !== ServiceApprovalStatus.APPROVED) {
    throw new ServiceNotFoundError();
  }

  const staffList = await prisma.staff.findMany({
    where: {
      isActive: true,
      branchId: service.branchId,
      services: {
        some: {
          serviceId: service.id,
        },
      },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      professionalProfile: true,
    },
  });

  return staffList.map((s) => ({
    id: s.id,
    name: s.user.name,
    profileImageUrl: s.profileImageUrl,
    role: s.staffRole,
    averageRating: s.averageRating,
    reviewCount: s.reviewCount,
    specialization: s.professionalProfile?.specialization || null,
  }));
}

export async function getStaffProfile(staffId, authUser) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: buildStaffUserSelect(),
  });

  if (!staff || !staff.isActive) {
    throw new StaffNotFoundError();
  }

  let isFavourite = false;
  if (authUser) {
    const client = await prisma.client.findUnique({
      where: { userId: authUser.sub },
      select: { id: true },
    });
    if (client) {
      const fav = await prisma.favoriteStaff.findUnique({
        where: {
          clientId_staffId: {
            clientId: client.id,
            staffId,
          },
        },
      });
      isFavourite = !!fav;
    }
  }

  return mapStaffPublicProfile(staff, staff.reviews, isFavourite);
}

export async function getStaffAvailableDays(staffId, serviceId) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true, isActive: true },
  });
  if (!staff || !staff.isActive) {
    throw new StaffNotFoundError();
  }

  const availabilities = await prisma.staffAvailability.findMany({
    where: {
      staffId,
      status: AvailabilityStatus.AVAILABLE,
    },
    select: {
      dayOfWeek: true,
    },
  });

  const activeDays = new Set(availabilities.map((a) => a.dayOfWeek));
  const availableDays = [];

  for (let i = 0; i < 30; i++) {
    const day = dayjs().add(i, "day");
    if (activeDays.has(day.day())) {
      availableDays.push(day.format("YYYY-MM-DD"));
    }
  }

  return {
    staffId,
    serviceId,
    availableDays,
  };
}

export async function getStaffAvailableSlots(staffId, serviceId, dateStr) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true, isActive: true, branchId: true },
  });
  if (!staff || !staff.isActive) {
    throw new StaffNotFoundError();
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, durationMinutes: true, status: true, branchId: true },
  });

  if (!service || service.status !== ServiceApprovalStatus.APPROVED || service.branchId !== staff.branchId) {
    throw new ServiceNotFoundError();
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

  const [startHour = 0, startMin = 0] = availability.startTime.split(":").map(Number);
  const [endHour = 0, endMin = 0] = availability.endTime.split(":").map(Number);

  let dayStart = dayjs(targetDate).hour(startHour).minute(startMin).second(0).millisecond(0).toDate();
  let dayEnd = dayjs(targetDate).hour(endHour).minute(endMin).second(0).millisecond(0).toDate();

  const now = new Date();
  if (dayStart < now) {
    dayStart = now;
  }

  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      staffId,
      status: {
        in: ["CONFIRMED", "IN_PROGRESS"],
      },
      scheduledAt: {
        gte: dayjs(targetDate).startOf("day").toDate(),
        lte: dayjs(targetDate).endOf("day").toDate(),
      },
    },
    select: {
      scheduledAt: true,
      service: {
        select: { durationMinutes: true },
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
