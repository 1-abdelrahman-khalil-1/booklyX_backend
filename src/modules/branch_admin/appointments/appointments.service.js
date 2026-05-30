import dayjs from "dayjs";
import { AppointmentStatus, PaymentStatus } from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import {
    AppointmentAccessError,
    AppointmentCancellationError,
    AppointmentNotFoundError,
    BranchNotFoundError,
} from "../errors.js";

export async function listAppointments(branchAdminUserId, query = {}) {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { userId: branchAdminUserId }, select: { id: true } });
  if (!branchAdmin) throw new BranchNotFoundError();

  /** @type {any} */
  const where = {
    branchId: branchAdmin.id,
    ...(query.status ? { status: query.status } : {}),
    ...(query.staffId ? { staffId: query.staffId } : {}),
  };

  if (query.date) {
    const targetDate = dayjs(query.date).toDate();
    where.scheduledAt = { gte: dayjs(targetDate).startOf("day").toDate(), lte: dayjs(targetDate).endOf("day").toDate() };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { scheduledAt: "desc" },
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      client: { select: { user: { select: { id: true, name: true, phone: true } } } },
      staff: { select: { id: true, user: { select: { id: true, name: true } } } },
      service: { select: { id: true, name: true, price: true, durationMinutes: true } },
      bookingPayment: { select: { status: true, paymentMethod: true, paidAt: true, amount: true } },
    },
  });

  return appointments.map((appointment) => ({
    id: appointment.id,
    scheduledAt: appointment.scheduledAt,
    status: appointment.status,
    client: appointment.client?.user ?? null,
    staff: appointment.staff?.user ?? null,
    service: appointment.service,
    paymentStatus: appointment.bookingPayment?.status ?? PaymentStatus.PENDING,
  }));
}

export async function getAppointmentDetails(branchAdminUserId, appointmentId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { userId: branchAdminUserId }, select: { id: true } });
  if (!branchAdmin) throw new BranchNotFoundError();

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      branchId: true,
      scheduledAt: true,
      status: true,
      client: { select: { id: true, user: { select: { id: true, name: true, phone: true } } } },
      staff: { select: { id: true, user: { select: { id: true, name: true } } } },
      service: { select: { id: true, name: true, description: true, price: true, durationMinutes: true } },
      bookingPayment: { select: { status: true, paymentMethod: true, paidAt: true, amount: true } },
      serviceExcutions: { select: { notes: true, attachments: true } },
    },
  });

  if (!appointment) throw new AppointmentNotFoundError();
  if (appointment.branchId !== branchAdmin.id) throw new AppointmentAccessError();

  return {
    id: appointment.id,
    scheduledAt: appointment.scheduledAt,
    status: appointment.status,
    client: appointment.client?.user ?? null,
    staff: appointment.staff?.user ?? null,
    service: appointment.service,
    paymentStatus: appointment.bookingPayment?.status ?? PaymentStatus.PENDING,
    paymentMethod: appointment.bookingPayment?.paymentMethod ?? null,
    paidAt: appointment.bookingPayment?.paidAt ?? null,
    amount: appointment.bookingPayment?.amount ?? null,
    notes: appointment.serviceExcutions?.[0]?.notes ?? null,
    attachments: appointment.serviceExcutions?.[0]?.attachments ?? null,
  };
}

export async function cancelAppointment(branchAdminUserId, appointmentId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { userId: branchAdminUserId }, select: { id: true } });
  if (!branchAdmin) throw new BranchNotFoundError();

  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true, branchId: true, status: true } });
  if (!appointment) throw new AppointmentNotFoundError();
  if (appointment.branchId !== branchAdmin.id) throw new AppointmentAccessError();
  if (appointment.status === AppointmentStatus.COMPLETED || appointment.status === AppointmentStatus.CANCELED) {
    throw new AppointmentCancellationError();
  }

  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.CANCELED },
    select: { id: true, status: true, updatedAt: true },
  });
}