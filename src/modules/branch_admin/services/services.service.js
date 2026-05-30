import {
    BranchStatus,
    ServiceApprovalStatus,
} from "../../../generated/prisma/client.js";
import { tr } from "../../../lib/i18n/index.js";
import prisma from "../../../lib/prisma.js";
import { AppError } from "../../../utils/AppError.js";
import { ensureServiceLimitNotExceeded } from "../../../utils/subscriptionGuards.js";
import {
    BranchAdminValidationError,
    BranchNotFoundError,
    ServiceCategoryNotFoundError,
    ServiceDependencyError,
} from "../errors.js";
import { mapServiceResponse } from "../helpers.js";

export async function addServiceCategory(data, branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
  });

  if (!branchAdmin) throw new BranchNotFoundError();
  if (branchAdmin.status !== BranchStatus.APPROVED) throw new BranchAdminValidationError(tr.BRANCH_IS_UNDER_REVIEW);

  const normalizedName = data.name.trim();

  return prisma.serviceCategory.upsert({
    where: { branchId_name: { branchId: branchAdmin.id, name: normalizedName } },
    create: { branchId: branchAdmin.id, name: normalizedName },
    update: {},
  });
}

export async function getMyServiceCategories(branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { userId: branchAdminUserId } });
  if (!branchAdmin) throw new BranchNotFoundError();

  return prisma.serviceCategory.findMany({
    where: { branchId: branchAdmin.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function createService(data, branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: {
      id: true,
      status: true,
      isSubscriptionActive: true,
      plan: { select: { id: true, maxStaff: true, maxServices: true, offersEnabled: true, loyaltyEnabled: true } },
    },
  });

  if (!branchAdmin) throw new BranchNotFoundError();
  if (branchAdmin.status !== BranchStatus.APPROVED) throw new BranchAdminValidationError(tr.BRANCH_IS_UNDER_REVIEW);

  await ensureServiceLimitNotExceeded(branchAdmin.id, branchAdmin);

  let categoryId = data.categoryId;
  if (data.categoryName) {
    const createdCategory = await prisma.serviceCategory.upsert({
      where: { branchId_name: { branchId: branchAdmin.id, name: data.categoryName.trim() } },
      create: { branchId: branchAdmin.id, name: data.categoryName.trim() },
      update: {},
    });
    categoryId = createdCategory.id;
  }

  if (categoryId) {
    const existingCategory = await prisma.serviceCategory.findFirst({
      where: { id: categoryId, branchId: branchAdmin.id },
    });
    if (!existingCategory) throw new ServiceCategoryNotFoundError();
  }

  const service = await prisma.service.create({
    data: {
      branchId: branchAdmin.id,
      serviceCategoryId: categoryId,
      name: data.name,
      description: data.description,
      price: data.price,
      durationMinutes: data.durationMinutes,
      imageUrl: data.imageUrl,
      status: ServiceApprovalStatus.PENDING_APPROVAL,
    },
    include: { category: true },
  });

  return mapServiceResponse(service);
}

export async function getMyServices(branchAdminUserId, query) {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { userId: branchAdminUserId } });
  if (!branchAdmin) throw new BranchNotFoundError();

  const services = await prisma.service.findMany({
    where: {
      branchId: branchAdmin.id,
      ...(query.status ? { status: query.status } : {}),
    },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return services.map(mapServiceResponse);
}

export async function updateService(data, branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { userId: branchAdminUserId } });
  if (!branchAdmin) throw new BranchNotFoundError();

  const service = await prisma.service.findFirst({ where: { id: data.id, branchId: branchAdmin.id } });
  if (!service) throw new AppError(tr.SERVICE_NOT_FOUND, 404);
  if (service.status !== ServiceApprovalStatus.PENDING_APPROVAL) {
    throw new BranchAdminValidationError(tr.SERVICE_CANNOT_EDIT_AFTER_APPROVAL);
  }

  let categoryId = service.serviceCategoryId;
  if (data.categoryName) {
    const createdCategory = await prisma.serviceCategory.upsert({
      where: { branchId_name: { branchId: branchAdmin.id, name: data.categoryName.trim() } },
      create: { branchId: branchAdmin.id, name: data.categoryName.trim() },
      update: {},
    });
    categoryId = createdCategory.id;
  } else if (data.categoryId) {
    const existingCategory = await prisma.serviceCategory.findFirst({
      where: { id: data.categoryId, branchId: branchAdmin.id },
    });
    if (!existingCategory) throw new ServiceCategoryNotFoundError();
    categoryId = data.categoryId;
  }

  const updatedService = await prisma.service.update({
    where: { id: service.id },
    data: {
      name: data.name ?? service.name,
      description: data.description ?? service.description,
      price: data.price ?? service.price,
      durationMinutes: data.durationMinutes ?? service.durationMinutes,
      imageUrl: data.imageUrl ?? service.imageUrl,
      serviceCategoryId: categoryId,
    },
    include: { category: true },
  });

  return mapServiceResponse(updatedService);
}

export async function deleteService(id, branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { userId: branchAdminUserId } });
  if (!branchAdmin) throw new BranchNotFoundError();

  const service = await prisma.service.findFirst({ where: { id, branchId: branchAdmin.id } });
  if (!service) throw new BranchNotFoundError();

  const [hasAppointmentLinks, hasReviewLinks, hasStaffLinks] = await Promise.all([
    prisma.appointment.findFirst({ where: { serviceId: service.id }, select: { id: true } }),
    prisma.review.findFirst({ where: { serviceId: service.id }, select: { id: true } }),
    prisma.staffService.findFirst({ where: { serviceId: service.id }, select: { staffId: true } }),
  ]);

  if (hasAppointmentLinks || hasReviewLinks || hasStaffLinks) {
    throw new ServiceDependencyError();
  }

  if (service.status !== ServiceApprovalStatus.PENDING_APPROVAL) {
    throw new BranchAdminValidationError(tr.SERVICE_CANNOT_DELETE_AFTER_APPROVAL);
  }

  await prisma.service.delete({ where: { id: service.id } });

  return { message: tr.SERVICE_DELETED };
}