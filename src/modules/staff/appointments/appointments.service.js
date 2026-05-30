import { AppointmentStatus, StaffRole } from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import {
    AppointmentAccessError,
    AppointmentNotFoundError,
    InvalidAppointmentStatusError,
    StaffNotFoundError,
} from "../errors.js";
import { getStaffIdByUserId } from "../helpers.js";

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
    orderBy: {
      scheduledAt: "asc",
    },
  });

  return appointments.map((apt) => {
    const aptAny = /** @type {any} */ (apt);
    return {
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
    };
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
