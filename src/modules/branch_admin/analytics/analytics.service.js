import dayjs from "dayjs";
import { AppointmentStatus, PaymentStatus, ServiceApprovalStatus } from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import { toRangeWhere } from "../../../utils/period.js";
import { ensureActiveSubscription } from "../../../utils/subscriptionGuards.js";
import { BranchNotFoundError } from "../errors.js";

export async function getBranchDashboardStats(branchAdminUserId, period = "this_month") {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { userId: branchAdminUserId }, select: { id: true } });
  if (!branchAdmin) throw new BranchNotFoundError();
  await ensureActiveSubscription(branchAdmin.id);

  const dateWhere = toRangeWhere(period, "scheduledAt");
  const paymentDateWhere = toRangeWhere(period, "paidAt");

  const [totalBookings, completedBookings, canceledBookings, paidPayments, clientsGroup, totalStaff, totalServices] = await Promise.all([
    prisma.appointment.count({ where: { branchId: branchAdmin.id, ...dateWhere } }),
    prisma.appointment.count({ where: { branchId: branchAdmin.id, status: AppointmentStatus.COMPLETED, ...dateWhere } }),
    prisma.appointment.count({ where: { branchId: branchAdmin.id, status: AppointmentStatus.CANCELED, ...dateWhere } }),
    prisma.bookingPayment.findMany({ where: { branchId: branchAdmin.id, status: PaymentStatus.PAID, ...paymentDateWhere }, select: { amount: true } }),
    prisma.appointment.groupBy({ by: ["clientId"], where: { branchId: branchAdmin.id, ...dateWhere } }),
    prisma.staff.count({ where: { branchId: branchAdmin.id, isActive: true } }),
    prisma.service.count({ where: { branchId: branchAdmin.id, status: ServiceApprovalStatus.APPROVED } }),
  ]);

  const totalRevenue = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);

  return {
    totalBookings,
    completedBookings,
    canceledBookings,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalClients: clientsGroup.length,
    totalStaff,
    totalServices,
  };
}

export async function getStaffEarnings(branchAdminUserId, period = "this_month") {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { userId: branchAdminUserId }, select: { id: true } });
  if (!branchAdmin) throw new BranchNotFoundError();
  await ensureActiveSubscription(branchAdmin.id);

  const dateWhere = toRangeWhere(period, "scheduledAt");
  const completedAppointments = await prisma.appointment.findMany({
    where: { branchId: branchAdmin.id, status: AppointmentStatus.COMPLETED, ...dateWhere },
    select: { staffId: true, service: { select: { price: true } }, staff: { select: { id: true, commissionPercentage: true, user: { select: { name: true } } } } },
  });

  const staffStats = new Map();
  for (const appointment of completedAppointments) {
    const staffId = appointment.staffId;
    const current = staffStats.get(staffId) ?? { staffId, staffName: appointment.staff?.user?.name ?? "Unknown", totalCompletedAppointments: 0, totalEarnings: 0 };
    const commission = appointment.staff?.commissionPercentage ?? 0;
    current.totalCompletedAppointments += 1;
    current.totalEarnings += (appointment.service?.price ?? 0) * (commission / 100);
    staffStats.set(staffId, current);
  }

  return [...staffStats.values()].map((entry) => ({ ...entry, totalEarnings: Number(entry.totalEarnings.toFixed(2)) }));
}

export async function getRevenueChartData(branchAdminUserId, period = "this_month") {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { userId: branchAdminUserId }, select: { id: true } });
  if (!branchAdmin) throw new BranchNotFoundError();
  await ensureActiveSubscription(branchAdmin.id);

  const dateWhere = toRangeWhere(period, "paidAt");
  const payments = await prisma.bookingPayment.findMany({ where: { branchId: branchAdmin.id, status: PaymentStatus.PAID, ...dateWhere }, select: { amount: true, paidAt: true }, orderBy: { paidAt: "asc" } });

  const chartData = {};
  payments.forEach((payment) => {
    if (!payment.paidAt) return;
    let key;
    if (period === "today") key = dayjs(payment.paidAt).format("HH:00");
    else if (period === "this_year") key = dayjs(payment.paidAt).format("YYYY-MM");
    else key = dayjs(payment.paidAt).format("YYYY-MM-DD");
    chartData[key] = (chartData[key] || 0) + payment.amount;
  });

  return Object.entries(chartData).map(([label, value]) => ({ label, revenue: Number(value.toFixed(2)) }));
}

export async function getRecentBookings(branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { userId: branchAdminUserId }, select: { id: true } });
  if (!branchAdmin) throw new BranchNotFoundError();
  await ensureActiveSubscription(branchAdmin.id);

  const appointments = await prisma.appointment.findMany({
    where: { branchId: branchAdmin.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      client: { select: { user: { select: { name: true, phone: true } } } },
      staff: { select: { user: { select: { name: true } } } },
      service: { select: { name: true, price: true, durationMinutes: true } },
      bookingPayment: { select: { status: true } },
    },
  });

  return appointments.map((apt) => ({
    id: apt.id,
    scheduledAt: apt.scheduledAt,
    status: apt.status,
    clientName: apt.client?.user?.name ?? null,
    clientPhone: apt.client?.user?.phone ?? null,
    staffName: apt.staff?.user?.name ?? null,
    serviceName: apt.service?.name ?? null,
    price: apt.service?.price ?? 0,
    durationMinutes: apt.service?.durationMinutes ?? 0,
    paymentStatus: apt.bookingPayment?.status ?? PaymentStatus.PENDING,
  }));
}

export async function getTopServices(branchAdminUserId, period = "this_month") {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { userId: branchAdminUserId }, select: { id: true } });
  if (!branchAdmin) throw new BranchNotFoundError();
  await ensureActiveSubscription(branchAdmin.id);

  const dateWhere = toRangeWhere(period, "scheduledAt");
  const appointments = await prisma.appointment.findMany({
    where: { branchId: branchAdmin.id, status: AppointmentStatus.COMPLETED, ...dateWhere },
    select: { service: { select: { id: true, name: true, price: true, imageUrl: true } }, bookingPayment: { select: { status: true, amount: true } } },
  });

  const serviceStats = {};
  appointments.forEach((apt) => {
    if (!apt.service) return;
    const sId = apt.service.id;
    if (!serviceStats[sId]) {
      serviceStats[sId] = { id: sId, name: apt.service.name, price: apt.service.price, imageUrl: apt.service.imageUrl, bookingCount: 0, revenue: 0 };
    }
    serviceStats[sId].bookingCount += 1;
    if (apt.bookingPayment?.status === PaymentStatus.PAID) serviceStats[sId].revenue += apt.bookingPayment.amount;
  });

  return Object.values(serviceStats).sort((a, b) => b.revenue - a.revenue || b.bookingCount - a.bookingCount).slice(0, 5).map((s) => ({ ...s, revenue: Number(s.revenue.toFixed(2)) }));
}

export async function getRecentTransactions(branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { userId: branchAdminUserId }, select: { id: true } });
  if (!branchAdmin) throw new BranchNotFoundError();
  await ensureActiveSubscription(branchAdmin.id);

  const payments = await prisma.bookingPayment.findMany({
    where: { branchId: branchAdmin.id, status: { in: [PaymentStatus.PAID, PaymentStatus.REFUNDED] } },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: {
      id: true,
      amount: true,
      status: true,
      paidAt: true,
      paymentMethod: true,
      appointment: { select: { client: { select: { user: { select: { name: true } } } }, service: { select: { name: true } } } },
    },
  });

  return payments.map((payment) => ({
    id: payment.id,
    amount: payment.amount,
    status: payment.status,
    paidAt: payment.paidAt,
    paymentMethod: payment.paymentMethod,
    clientName: payment.appointment?.client?.user?.name ?? null,
    serviceName: payment.appointment?.service?.name ?? null,
  }));
}