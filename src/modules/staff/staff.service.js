import dayjs from "dayjs";
import {
  AppointmentStatus,
  AvailabilityStatus,
  ServiceApprovalStatus,
  StaffRole,
} from "../../generated/prisma/client.js";
import { tr } from "../../lib/i18n/index.js";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { IncomeRange } from "../../utils/enums.js";
export { getStaffProfile } from "./staff.profile.js";

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
    super(tr.APPOINTMENT_ACCESS_DENIED, 403);
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

// ─── Staff Schedule ─────────────────────────────────────────────────────
export async function getStaffSchedule(userId, dateStr) {
  const staffId = await getStaffIdByUserId(userId);

  const targetDate = dayjs(dateStr).toDate();
  const dayStart = dayjs(targetDate).startOf("day").toDate();
  const dayEnd = dayjs(targetDate).endOf("day").toDate();

  const appointments = await prisma.appointment.findMany({
    where: {
      staffId,
      status: {
        in: [AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS],
      },
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
          price: true,
        },
      },
      scheduledAt: true,
      status: true,
    },
    orderBy: { scheduledAt: "asc" },
  });


  // Format appointments to BookingModel-compatible JSON (snake_case keys)
  const formattedAppointments = appointments.map((apt) => {
    const aptAny = /** @type {any} */ (apt);
    return ({
    id: apt.id,
    client: apt.client
      ? {
          user: {
            id: ((/** @type {any} */ (apt.client.user))?.id),
            name: ((/** @type {any} */ (apt.client.user))?.name),
            phone: ((/** @type {any} */ (apt.client.user))?.phone),
            avatar_url:
              ((/** @type {any} */ (apt.client.user))?.profileImageUrl) ?? ((/** @type {any} */ (apt.client.user))?.avatarUrl) ?? null,
          },
        }
      : null,
    status: (apt.status || "").toLowerCase(),
    service: apt.service
      ? {
          id: ((/** @type {any} */ (apt.service))?.id),
          name: ((/** @type {any} */ (apt.service))?.name),
          description: ((/** @type {any} */ (apt.service))?.description) ?? null,
          price: ((/** @type {any} */ (apt.service))?.price) ?? null,
          duration_minutes:
            ((/** @type {any} */ (apt.service))?.durationMinutes) ?? ((/** @type {any} */ (apt.service))?.duration_minutes) ?? null,
        }
      : null,
    scheduled_at: apt.scheduledAt ? new Date(apt.scheduledAt).toISOString() : null,
    notes: aptAny.notes ?? null,
    has_attachments: !!(aptAny.attachments || aptAny.serviceExecution?.attachments?.length),
  });
  });

  return { appointments: formattedAppointments };
}


export async function getAppointments(userId, statusFilter) {
  const staffId = await getStaffIdByUserId(userId);
  let statusCondition;

  if (!statusFilter) {
    statusCondition = AppointmentStatus.PENDING;
  } else if (Object.values(AppointmentStatus).includes(statusFilter)) {
    statusCondition = statusFilter;
  } else if (statusFilter === "pending") {
    statusCondition = AppointmentStatus.PENDING;
  } else if (statusFilter === "open") {
    statusCondition = AppointmentStatus.IN_PROGRESS;
  } else if (statusFilter === "closed") {
    statusCondition = {
      in: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELED],
    };
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      staffId,
      ...(statusCondition && { status: statusCondition }),
    },
    select: {
      id: true,
      client: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true
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
    },
    orderBy: {
      scheduledAt: "asc"
    },
  });

  // Return appointments formatted to BookingModel-compatible JSON
  return appointments.map((apt) => {
    const aptAny = /** @type {any} */ (apt);
    return ({
    id: apt.id,
    client: apt.client
      ? {
          user: {
            id: ((/** @type {any} */ (apt.client.user))?.id),
            name: ((/** @type {any} */ (apt.client.user))?.name),
            phone: ((/** @type {any} */ (apt.client.user))?.phone),
            avatar_url:
              ((/** @type {any} */ (apt.client.user))?.profileImageUrl) ?? ((/** @type {any} */ (apt.client.user))?.avatarUrl) ?? null,
          },
        }
      : null,
    status: (apt.status || "").toLowerCase(),
    service: apt.service
      ? {
          id: ((/** @type {any} */ (apt.service))?.id),
          name: ((/** @type {any} */ (apt.service))?.name),
          description: ((/** @type {any} */ (apt.service))?.description) ?? null,
          price: ((/** @type {any} */ (apt.service))?.price) ?? null,
          duration_minutes:
            ((/** @type {any} */ (apt.service))?.durationMinutes) ?? ((/** @type {any} */ (apt.service))?.duration_minutes) ?? null,
        }
      : null,
    scheduled_at: apt.scheduledAt ? new Date(apt.scheduledAt).toISOString() : null,
    notes: aptAny.notes ?? null,
    has_attachments: !!(aptAny.attachments || aptAny.serviceExecution?.attachments?.length),
  });
  });
}

export async function getAppointmentDetails(userId, appointmentId) {
  const staffId = await getStaffIdByUserId(userId);
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
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
    },
  });

  if (!appointment) {
    throw new AppointmentNotFoundError();
  }

  if (appointment.staffId !== staffId) {
    throw new AppointmentAccessError();
  }

  const { staffId: _, ...response } = appointment;
  return response;
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
  const staffRecord = await prisma.staff.findUnique({
    where: { userId },
    select: {
      id: true,
      staffRole: true,
    },
  });

  if (!staffRecord) {
    throw new StaffNotFoundError();
  }

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

  if (appointment.staffId !== staffRecord.id) {
    throw new AppointmentAccessError();
  }

  if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
    throw new InvalidAppointmentStatusError();
  }

  const [excution, updated] = await prisma.$transaction(async (tx) => {
    const exc = await tx.serviceExecution.create({
      data: {
        appointmentId,
        notes: data.notes,
        attachments: data.attachments,
      },
    });
    const upd = await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.COMPLETED },
      select: {
        id: true,
        status: true,
      },
    });
    return [exc, upd];
  });

  if (staffRecord.staffRole === StaffRole.DOCTOR) {
    return {
      ...updated,
      notes: excution.notes,
      attachments: excution.attachments,
    };
  }

  return {
    ...updated,
    notes: excution.notes,
  };
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
  const sortedDailyStats = Object.values(dailyStats).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

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
    duration_minutes: link.service.durationMinutes,
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
  if (
    availableHourStart === undefined ||
    availableMinStart === undefined ||
    availableHourEnd === undefined ||
    availableMinEnd === undefined
  ) {
    throw new AppError(tr.STAFF_TIME_FORMAT_INVALID, 400);
  }

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