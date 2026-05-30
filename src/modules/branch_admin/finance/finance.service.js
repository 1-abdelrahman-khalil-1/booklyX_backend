import dayjs from "dayjs";
import { AppointmentStatus, PaymentStatus, ServiceApprovalStatus } from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import { toRangeWhere } from "../../../utils/period.js";
import { ensureActiveSubscription } from "../../../utils/subscriptionGuards.js";
import {
    BookingPaymentAccessError,
    BookingPaymentNotFoundError,
    BranchNotFoundError,
    PaymentAlreadyRefundedError,
    PaymentNotPaidError,
} from "../errors.js";

export async function getBranchFinanceStats(branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { userId: branchAdminUserId }, select: { id: true } });
  if (!branchAdmin) throw new BranchNotFoundError();
  await ensureActiveSubscription(branchAdmin.id);

  const startOfMonth = dayjs().startOf("month").toDate();
  const endOfMonth = dayjs().endOf("month").toDate();

  const [monthlyPayments, totalPayments, activeServices, completedBookings] = await Promise.all([
    prisma.bookingPayment.findMany({ where: { branchId: branchAdmin.id, status: PaymentStatus.PAID, paidAt: { gte: startOfMonth, lte: endOfMonth } }, select: { amount: true } }),
    prisma.bookingPayment.count({ where: { branchId: branchAdmin.id, status: PaymentStatus.PAID } }),
    prisma.service.count({ where: { branchId: branchAdmin.id, status: ServiceApprovalStatus.APPROVED } }),
    prisma.appointment.count({ where: { branchId: branchAdmin.id, status: AppointmentStatus.COMPLETED } }),
  ]);

  const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

  return { monthlyRevenue: Number(monthlyRevenue.toFixed(2)), totalPayments, activeServices, completedBookings };
}

export async function listFinancePayments(branchAdminUserId, query = {}) {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { userId: branchAdminUserId }, select: { id: true } });
  if (!branchAdmin) throw new BranchNotFoundError();
  await ensureActiveSubscription(branchAdmin.id);

  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  /** @type {any} */
  const where = { branchId: branchAdmin.id, ...(query.status ? { status: query.status } : {}) };
  if (query.date) {
    const start = dayjs(query.date).startOf("day").toDate();
    const end = dayjs(query.date).endOf("day").toDate();
    where.paidAt = { gte: start, lte: end };
  } else if (query.startDate || query.endDate) {
    where.paidAt = {};
    if (query.startDate) where.paidAt.gte = dayjs(query.startDate).toDate();
    if (query.endDate) where.paidAt.lte = dayjs(query.endDate).toDate();
  }

  const [payments, total] = await Promise.all([
    prisma.bookingPayment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        amount: true,
        status: true,
        paymentMethod: true,
        paidAt: true,
        appointment: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            client: { select: { user: { select: { name: true, phone: true } } } },
            service: { select: { name: true } },
          },
        },
      },
    }),
    prisma.bookingPayment.count({ where }),
  ]);

  return {
    payments: payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      paymentMethod: p.paymentMethod,
      paidAt: p.paidAt,
      appointmentId: p.appointment?.id ?? null,
      clientName: p.appointment?.client?.user?.name ?? null,
      serviceName: p.appointment?.service?.name ?? null,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function processBookingPaymentRefund(branchAdminUserId, paymentId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { userId: branchAdminUserId }, select: { id: true } });
  if (!branchAdmin) throw new BranchNotFoundError();
  await ensureActiveSubscription(branchAdmin.id);

  const payment = await prisma.bookingPayment.findUnique({ where: { id: paymentId }, select: { id: true, branchId: true, status: true } });
  if (!payment) throw new BookingPaymentNotFoundError();
  if (payment.branchId !== branchAdmin.id) throw new BookingPaymentAccessError();
  if (payment.status === PaymentStatus.REFUNDED) throw new PaymentAlreadyRefundedError();
  if (payment.status !== PaymentStatus.PAID) throw new PaymentNotPaidError();

  return prisma.bookingPayment.update({
    where: { id: paymentId },
    data: { status: PaymentStatus.REFUNDED },
    select: { id: true, amount: true, status: true, paidAt: true, updatedAt: true },
  });
}

export async function exportFinanceReport(branchAdminUserId, query = {}) {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { userId: branchAdminUserId }, select: { id: true } });
  if (!branchAdmin) throw new BranchNotFoundError();
  await ensureActiveSubscription(branchAdmin.id);

  /** @type {any} */
  let dateWhere = {};
  if (query.period) {
    dateWhere = toRangeWhere(query.period, "paidAt");
  } else if (query.startDate || query.endDate) {
    dateWhere.paidAt = {};
    if (query.startDate) dateWhere.paidAt.gte = dayjs(query.startDate).toDate();
    if (query.endDate) dateWhere.paidAt.lte = dayjs(query.endDate).toDate();
  }

  const payments = await prisma.bookingPayment.findMany({
    where: { branchId: branchAdmin.id, ...dateWhere },
    orderBy: { paidAt: "asc" },
    select: {
      id: true,
      amount: true,
      status: true,
      paymentMethod: true,
      paidAt: true,
      appointment: {
        select: {
          scheduledAt: true,
          client: { select: { user: { select: { name: true, phone: true } } } },
          service: { select: { name: true } },
        },
      },
    },
  });

  let csv = "Payment ID,Amount,Status,Payment Method,Paid At,Client Name,Client Phone,Service,Appointment Time\n";
  payments.forEach((p) => {
    const paidAtStr = p.paidAt ? p.paidAt.toISOString() : "";
    const scheduledStr = p.appointment?.scheduledAt ? p.appointment.scheduledAt.toISOString() : "";
    const clientName = p.appointment?.client?.user?.name ?? "";
    const clientPhone = p.appointment?.client?.user?.phone ?? "";
    const serviceName = p.appointment?.service?.name ?? "";
    csv += `"${p.id}","${p.amount}","${p.status}","${p.paymentMethod}","${paidAtStr}","${clientName.replace(/"/g, '""')}","${clientPhone}","${serviceName.replace(/"/g, '""')}","${scheduledStr}"\n`;
  });

  return csv;
}