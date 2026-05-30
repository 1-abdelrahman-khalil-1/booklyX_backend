import { ServiceApprovalStatus } from "../../../generated/prisma/client.js";
import { tr } from "../../../lib/i18n/index.js";
import prisma from "../../../lib/prisma.js";
import { AppError } from "../../../utils/AppError.js";
import { StaffNotFoundError } from "../errors.js";

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
  const staff = await prisma.staff.findUnique({
    where: { userId },
    select: { id: true, branchId: true },
  });

  if (!staff) {
    throw new StaffNotFoundError();
  }
  const staffId = staff.id;

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
