import { PaymentStatus } from "../../../generated/prisma/client.js";
import { tr } from "../../../lib/i18n/index.js";
import prisma from "../../../lib/prisma.js";
import { AppError } from "../../../utils/AppError.js";
import { toRangeWhere } from "../../../utils/period.js";

export class PaymentNotFoundError extends AppError {
  constructor() {
    super(tr.PAYMENT_NOT_FOUND, 404);
    this.name = "PaymentNotFoundError";
  }
}

export class InvalidPaymentStatusForRefundError extends AppError {
  constructor() {
    super(tr.INVALID_PAYMENT_STATUS_FOR_REFUND, 400);
    this.name = "InvalidPaymentStatusForRefundError";
  }
}

export class PaymentAlreadyRefundedError extends AppError {
  constructor() {
    super(tr.PAYMENT_ALREADY_REFUNDED, 409);
    this.name = "PaymentAlreadyRefundedError";
  }
}

/**
 * @param {{page?:number, limit?:number, status?:import("../../../generated/prisma/client.js").PaymentStatus, search?:string, period?:any}} [opts]
 */
export async function listBranchPayments({ page = 1, limit = 10, status, search, period } = {}) {
  /** @type {any} */
  const dateWhere = period ? toRangeWhere(period, "paidAt") : {};
  const skip = (page - 1) * limit;
  /** @type {any} */
  const where = { ...dateWhere };
  if (status) where.status = status;
  if (search) where.branch = { is: { businessName: { contains: search } } };

  const [payments, totalCount] = await Promise.all([
    prisma.subscriptionPayment.findMany({ where, select: { id: true, amount: true, status: true, paidAt: true, branch: { select: { id: true, businessName: true } }, plan: { select: { id: true, name: true } } }, orderBy: { paidAt: "desc" }, skip, take: limit }),
    prisma.subscriptionPayment.count({ where }),
  ]);

  const mappedPayments = payments.map((payment) => ({ paymentId: payment.id, branchId: payment.branch.id, businessName: payment.branch.businessName, planName: payment.plan.name, amount: payment.amount, paymentStatus: payment.status, paidAt: payment.paidAt }));

  return { payments: mappedPayments, meta: { totalRecords: totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) } };
}

export async function getBranchPaymentDetails(paymentId) {
  const payment = await prisma.subscriptionPayment.findUnique({ where: { id: paymentId }, select: { id: true, amount: true, status: true, paymentMethod: true, paidAt: true, branch: { select: { id: true, businessName: true, ownerName: true, category: true, city: true, district: true, address: true, logoUrl: true, status: true, isSubscriptionActive: true, subscriptionStartedAt: true } }, plan: { select: { id: true, name: true, price: true, maxStaff: true, maxServices: true, loyaltyEnabled: true, offersEnabled: true } } } });
  if (!payment) throw new PaymentNotFoundError();
  return { paymentId: payment.id, branch: payment.branch, plan: payment.plan, amount: payment.amount, paymentStatus: payment.status, paymentMethod: payment.paymentMethod, paidAt: payment.paidAt, subscriptionStartedAt: payment.branch.subscriptionStartedAt };
}

export async function refundBranchPayment(paymentId) {
  const payment = await prisma.subscriptionPayment.findUnique({ where: { id: paymentId }, select: { id: true, amount: true, status: true, branchId: true } });
  if (!payment) throw new PaymentNotFoundError();
  if (payment.status === PaymentStatus.REFUNDED) throw new PaymentAlreadyRefundedError();
  if (payment.status !== PaymentStatus.PAID) throw new InvalidPaymentStatusForRefundError();

  const mockGatewayRefundId = `ref_${Math.random().toString(36).substring(2, 11)}`;
  await prisma.$transaction(async (tx) => {
    await tx.subscriptionPayment.update({ where: { id: paymentId }, data: { status: PaymentStatus.REFUNDED } });
    await tx.branchAdmin.update({ where: { id: payment.branchId }, data: { isSubscriptionActive: false } });
  });

  return { paymentId: payment.id, amount: payment.amount, status: PaymentStatus.REFUNDED, refundId: mockGatewayRefundId };
}
