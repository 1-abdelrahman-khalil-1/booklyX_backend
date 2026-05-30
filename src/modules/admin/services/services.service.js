import { ServiceApprovalStatus } from "../../../generated/prisma/client.js";
import { tr } from "../../../lib/i18n/index.js";
import prisma from "../../../lib/prisma.js";
import { AppError } from "../../../utils/AppError.js";

export class ServiceNotFound extends AppError {
  constructor() {
    super(tr.SERVICE_NOT_FOUND, 404);
    this.name = "ServiceNotFound";
  }
}

export class ServiceNotPendingError extends AppError {
  constructor() {
    super(tr.SERVICE_IS_NOT_PENDING_APPROVAL, 409);
    this.name = "ServiceNotPendingError";
  }
}

export async function listServices(status) {
  return prisma.service.findMany({
    where: status ? { status } : { status: ServiceApprovalStatus.PENDING_APPROVAL },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      price: true,
      durationMinutes: true,
      status: true,
      createdAt: true,
      category: { select: { id: true, name: true } },
      branch: { select: { id: true, businessName: true, logoUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getServiceDetails(id) {
  const service = await prisma.service.findUnique({
    where: { id },
    select: {
      id: true,
      branchId: true,
      name: true,
      imageUrl: true,
      description: true,
      price: true,
      durationMinutes: true,
      status: true,
      rejectionReason: true,
      approvedAt: true,
      createdAt: true,
      updatedAt: true,
      category: { select: { id: true, name: true } },
      branch: { select: { id: true, businessName: true, logoUrl: true, status: true, isSubscriptionActive: true } },
    },
  });
  if (!service) throw new ServiceNotFound();
  return service;
}

export async function approveService(id) {
  const service = await prisma.service.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!service) throw new ServiceNotFound();
  if (service.status !== ServiceApprovalStatus.PENDING_APPROVAL) throw new ServiceNotPendingError();

  const updatedService = await prisma.service.update({
    where: { id: service.id },
    data: { status: ServiceApprovalStatus.APPROVED, rejectionReason: null, approvedAt: new Date() },
    select: { id: true, branchId: true, serviceCategoryId: true, name: true, description: true, price: true, durationMinutes: true, imageUrl: true, status: true, approvedAt: true, updatedAt: true, category: { select: { id: true, name: true } } },
  });

  return { message: tr.SERVICE_APPROVED, service: updatedService };
}

export async function rejectService(id, reason) {
  const service = await prisma.service.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!service) throw new ServiceNotFound();
  if (service.status !== ServiceApprovalStatus.PENDING_APPROVAL) throw new ServiceNotPendingError();

  const updatedService = await prisma.service.update({ where: { id: service.id }, data: { status: ServiceApprovalStatus.REJECTED, rejectionReason: reason, approvedAt: null }, select: { id: true, branchId: true, serviceCategoryId: true, name: true, description: true, price: true, durationMinutes: true, imageUrl: true, status: true, rejectionReason: true, updatedAt: true, category: { select: { id: true, name: true } } } });

  return { message: tr.SERVICE_REJECTED, service: updatedService };
}
