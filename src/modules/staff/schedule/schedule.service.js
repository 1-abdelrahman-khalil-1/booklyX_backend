import dayjs from "dayjs";
import { AppointmentStatus } from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import { getStaffIdByUserId } from "../helpers.js";

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

  const formattedAppointments = appointments.map((apt) => {
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

  return { appointments: formattedAppointments };
}
