import dayjs from "dayjs";
import {
  AppointmentStatus,
  AvailabilityStatus,
  ServiceApprovalStatus,
} from "../../generated/prisma/client.js";
import { tr } from "../../lib/i18n/index.js";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { IncomeRange } from "../../utils/enums.js";
import { id } from "zod/locales";

// ─── Custom Error Classes ───────────────────────────────────────────────
class StaffNotFoundError extends AppError {
  constructor() {
    super(tr.STAFF_NOT_FOUND, 404);
    this.name = "StaffNotFoundError";
  }
}

class AppointmentNotFoundError extends AppError {
  constructor() {
    super(tr.APPOINTMENT_NOT_FOUND, 404);
    this.name = "AppointmentNotFoundError";
  }
}

class AppointmentAccessError extends AppError {
  constructor() {
    super(tr.APPOINTMENT_NOT_FOUND, 403);
    this.name = "AppointmentAccessError";
  }
}

class AvailabilityNotFoundError extends AppError {
  constructor() {
    super(tr.AVAILABILITY_NOT_FOUND, 404);
    this.name = "AvailabilityNotFoundError";
  }
}

class AvailabilityAccessError extends AppError {
  constructor() {
    super(tr.AVAILABILITY_NOT_FOUND, 403);
    this.name = "AvailabilityAccessError";
  }
}

class DuplicateAvailabilityError extends AppError {
  constructor() {
    super(tr.AVAILABILITY_ALREADY_EXISTS, 409);
    this.name = "DuplicateAvailabilityError";
  }
}

class InvalidAppointmentStatusError extends AppError {
  constructor() {
    super(tr.INVALID_APPOINTMENT_STATUS, 400);
    this.name = "InvalidAppointmentStatusError";
  }
}

// ─── Helper: Get Staff ID from User ID ──────────────────────────────────
async function getStaffIdByUserId(userId) {
  const staff = await prisma.staff.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!staff) {
    throw new StaffNotFoundError();
  }
  return staff.id;
}

// ─── Staff Profile ──────────────────────────────────────────────────────
export async function getStaffProfile(userId) {
  const staff = await prisma.staff.findUnique({
    where: { userId },
    select: {
      id: true,
      profileImageUrl: true,
      age: true,
      staffRole: true,
      commissionPercentage: true,
      averageRating: true,
      reviewCount: true,
      user: {
        select: {
          name: true,
          phone: true,
        },
      },
      branch: {
        select: {
          businessName: true,
          category: true,
        },
      },
      professionalProfile: {
        select: {
          bio: true,
          yearsOfExperience: true,
          specialization: true,
        },
      },
    },
  });

  if (!staff) {
    throw new StaffNotFoundError();
  }

  return {
    id: staff.id,
    name: staff.user.name,
    phone: staff.user.phone,
    profileImageUrl: staff.profileImageUrl,
    staffRole: staff.staffRole,
    age: staff.age,
    commissionPercentage: staff.commissionPercentage,
    branch: {
      businessName: staff.branch.businessName,
      category: staff.branch.category,
    },
    professionalProfile: staff.professionalProfile
      ? {
        bio: staff.professionalProfile.bio,
        experience: staff.professionalProfile.yearsOfExperience,
        specialization: staff.professionalProfile.specialization,
      }
      : null,
    averageRating: staff.averageRating,
    reviewCount: staff.reviewCount,
  };
}

// ─── Staff Schedule ─────────────────────────────────────────────────────
export async function getStaffSchedule(userId, dateStr) {
  // Get staff ID from userId
  const staffId = await getStaffIdByUserId(userId);

  const targetDate = dayjs(dateStr).toDate();
  const dayStart = dayjs(targetDate).startOf("day").toDate();
  const dayEnd = dayjs(targetDate).endOf("day").toDate();

  // Get future appointments (next 30 days from target date)
  const futureStart = dayjs(targetDate).add(1, "day").startOf("day").toDate();
  const futureEnd = dayjs(targetDate).add(30, "day").endOf("day").toDate();

  const [todayAppointments, upcomingAppointments] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        staffId,
        scheduledAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      select: {
        id: true,
        client: {
          select: {
            user: {
              select: { name: true },
            },
          },
        },
        service: {
          select: {
            name: true,
            durationMinutes: true,
          },
        },
        scheduledAt: true,
        status: true,
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        staffId,
        scheduledAt: {
          gte: futureStart,
          lte: futureEnd,
        },
      },
      select: {
        id: true,
        client: {
          select: {
            user: {
              select: { name: true },
            },
          },
        },
        service: {
          select: {
            name: true,
            durationMinutes: true,
          },
        },
        scheduledAt: true,
        status: true,
      },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  const formatAppointment = (apt) => ({
    id: apt.id,
    clientName: apt.client.user.name,
    serviceName: apt.service.name,
    scheduledAt: apt.scheduledAt.toISOString(),
    duration: apt.service.durationMinutes,
    status: apt.status,
  });

  return {
    today: todayAppointments.map(formatAppointment),
    upcoming: upcomingAppointments.map(formatAppointment),
  };
}

// ─── Pending Requests ───────────────────────────────────────────────────
export async function getPendingRequests(userId) {
  const staffId = await getStaffIdByUserId(userId);

  const pendingAppointments = await prisma.appointment.findMany({
    where: {
      staffId,
      status: AppointmentStatus.PENDING,
    },
    select: {
      id: true,
      client: {
        select: {
          user: {
            select: { name: true },
          },
        },
      },
      service: {
        select: {
          name: true,
          durationMinutes: true,
        },
      },
      scheduledAt: true,
    },
    orderBy: { scheduledAt: "asc" },
  });

  return pendingAppointments.map((apt) => ({
    id: apt.id,
    clientName: apt.client.user.name,
    serviceName: apt.service.name,
    scheduledAt: apt.scheduledAt.toISOString(),
    duration: apt.service.durationMinutes,
  }));
}

// ─── Accept/Reject Appointment ──────────────────────────────────────────
export async function acceptAppointment(userId, appointmentId) {
  const staffId = await getStaffIdByUserId(userId);
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      staffId: true,
      status: true,
    },
  });

  if (!appointment) {
    throw new AppointmentNotFoundError();
  }

  if (appointment.staffId !== staffId) {
    throw new AppointmentAccessError();
  }

  if (appointment.status !== AppointmentStatus.PENDING) {
    throw new InvalidAppointmentStatusError();
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.CONFIRMED },
    select: {
      id: true,
      status: true,
    },
  });

  return updated;
}

export async function rejectAppointment(userId, appointmentId) {
  const staffId = await getStaffIdByUserId(userId);
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      staffId: true,
      status: true,
    },
  });

  if (!appointment) {
    throw new AppointmentNotFoundError();
  }

  if (appointment.staffId !== staffId) {
    throw new AppointmentAccessError();
  }

  if (appointment.status !== AppointmentStatus.PENDING) {
    throw new InvalidAppointmentStatusError();
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.CANCELED },
    select: {
      id: true,
      status: true,
    },
  });

  return updated;
}

// ─── Service Execution ──────────────────────────────────────────────────
export async function startAppointment(userId, appointmentId) {
  const staffId = await getStaffIdByUserId(userId);
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      staffId: true,
      status: true,
    },
  });

  if (!appointment) {
    throw new AppointmentNotFoundError();
  }

  if (appointment.staffId !== staffId) {
    throw new AppointmentAccessError();
  }

  if (appointment.status !== AppointmentStatus.CONFIRMED) {
    throw new InvalidAppointmentStatusError();
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.IN_PROGRESS },
    select: {
      id: true,
      status: true,
    },
  });

  return updated;
}

export async function completeAppointment(userId, appointmentId, data) {
  const staff = await getStaffProfile(userId);
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      staffId: true,
      status: true,
    },
  });

  if (!appointment) {
    throw new AppointmentNotFoundError();
  }

  if (appointment.staffId !== staff.id) {
    throw new AppointmentAccessError();
  }

  if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
    throw new InvalidAppointmentStatusError();
  }
  const excution = await prisma.serviceExecution.create({
    data: {
      appointmentId,
      notes: data.notes,
      attachments: data.attachments,
    },
  });
  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.COMPLETED },
    select: {
      id: true,
      status: true,
    },
  });

  if (staff.staffRole === staffRole.DOCTOR) {
    return {
      ...updated,
      notes: excution.notes,
      attachments: excution.attachments,
    }
  } else {
    return {
      ...updated,
      notes: excution.notes,
    };
  }
}

// ─── Income Tracking ────────────────────────────────────────────────────
export async function getIncomeStats(userId, range) {
  const staff = await prisma.staff.findUnique({
    where: { userId },
    select: {
      id: true,
      commissionPercentage: true,
      branchId: true,
    },
  });

  if (!staff) {
    throw new StaffNotFoundError();
  }
  const staffId = staff.id;

  let startDate, endDate, groupByFormat;

  if (range === IncomeRange.WEEKLY) {
    startDate = dayjs().subtract(7, "day").startOf("day").toDate();
    endDate = dayjs().endOf("day").toDate();
    groupByFormat = "ddd";
  } else {
    startDate = dayjs().startOf("month").toDate();
    endDate = dayjs().endOf("month").toDate();
    groupByFormat = "DD";
  }

  // Get completed appointments in date range
  const completedAppointments = await prisma.appointment.findMany({
    where: {
      staffId,
      status: AppointmentStatus.COMPLETED,
      scheduledAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      service: {
        select: {
          price: true,
        },
      },
      scheduledAt: true,
    },
  });

  // Calculate earnings
  let totalEarnings = 0;
  const dailyStats = {};

  completedAppointments.forEach((apt) => {
    const earning = apt.service.price * (staff.commissionPercentage / 100);
    totalEarnings += earning;

    const dateKey = dayjs(apt.scheduledAt).format(groupByFormat);
    if (!dailyStats[dateKey]) {
      dailyStats[dateKey] = {
        date: dayjs(apt.scheduledAt).format("YYYY-MM-DD"),
        earnings: 0,
        serviceCount: 0,
      };
    }
    dailyStats[dateKey].earnings += earning;
    dailyStats[dateKey].serviceCount += 1;
  });

  // Sort daily stats
  const sortedDailyStats = Object.values(dailyStats).sort((a, b) => new Date(a.date) - new Date(b.date));

  return {
    totalEarnings: Number(totalEarnings.toFixed(2)),
    serviceCount: completedAppointments.length,
    range,
    dailyStats: sortedDailyStats,
  };
}

// ─── Staff Services ─────────────────────────────────────────────────────
export async function listStaffServices(userId) {
  const staff = await prisma.staff.findUnique({
    where: { userId },
    select: { id: true, branchId: true },
  });

  if (!staff) {
    throw new StaffNotFoundError();
  }
  const staffId = staff.id;

  const services = await prisma.staffService.findMany({
    where: { staffId },
    select: {
      service: {
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          durationMinutes: true,
          imageUrl: true,
          status: true,
        },
      },
    },
  });

  return services.map((link) => ({
    id: link.service.id,
    name: link.service.name,
    description: link.service.description,
    price: link.service.price,
    durationMinutes: link.service.durationMinutes,
    imageUrl: link.service.imageUrl,
    status: link.service.status,
  }));
}

export async function addStaffService(userId, serviceId) {
  // Verify staff exists
  const staff = await prisma.staff.findUnique({
    where: { userId },
    select: { id: true, branchId: true },
  });

  if (!staff) {
    throw new StaffNotFoundError();
  }
  const staffId = staff.id;

  // Verify service exists and belongs to same branch
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: {
      id: true,
      branchId: true,
      status: true,
    },
  });

  if (!service) {
    throw new AppError(tr.SERVICE_NOT_FOUND, 404);
  }

  if (service.branchId !== staff.branchId) {
    throw new AppError(tr.SERVICE_NOT_FOUND, 404);
  }

  if (service.status !== ServiceApprovalStatus.APPROVED) {
    throw new AppError(tr.SERVICE_NOT_APPROVED, 400);
  }

  // Check if already linked
  const existing = await prisma.staffService.findUnique({
    where: {
      staffId_serviceId: {
        staffId,
        serviceId,
      },
    },
  });

  if (existing) {
    throw new AppError(tr.SERVICE_ALREADY_LINKED, 409);
  }

  await prisma.staffService.create({
    data: {
      staffId,
      serviceId,
    },
  });

  return { serviceId };
}

// ─── Staff Availability ─────────────────────────────────────────────────
export async function listStaffAvailability(userId) {
  const staffId = await getStaffIdByUserId(userId);

  const availabilities = await prisma.staffAvailability.findMany({
    where: { staffId },
    orderBy: { dayOfWeek: "asc" },
    select: {
      id: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      status: true,
    },
  });

  return availabilities;
}

export async function createStaffAvailability(userId, data) {
  const staffId = await getStaffIdByUserId(userId);

  // Check for existing availability on same day
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

  // If dayOfWeek is being updated, check for conflicts
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

// ─── Available Slots Calculation ────────────────────────────────────────
export async function getAvailableSlots(userId, dateStr, serviceId) {
  const staff = await prisma.staff.findUnique({
    where: { userId },
    select: {
      id: true,
      branchId: true,
    },
  });

  if (!staff) {
    throw new StaffNotFoundError();
  }
  const staffId = staff.id;

  // Get service
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
  const dayOfWeek = dayjs(targetDate).day(); // 0 = Sunday

  // Get availability for this day of week
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

  // Parse available hours
  const [availableHourStart, availableMinStart] = availability.startTime.split(":").map(Number);
  const [availableHourEnd, availableMinEnd] = availability.endTime.split(":").map(Number);

  let dayStart = dayjs(targetDate).hour(availableHourStart).minute(availableMinStart).toDate();
  let dayEnd = dayjs(targetDate).hour(availableHourEnd).minute(availableMinEnd).toDate();

  // Don't allow past times
  const now = new Date();
  if (dayStart < now) {
    dayStart = now;
  }

  // Get booked appointments for this day
  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      staffId,
      serviceId,
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

  // Generate slots (30-minute slots)
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
