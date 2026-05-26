import dayjs from "dayjs";
import { prisma } from "../helpers/prisma.js";
import { SERVICE_PLANS } from "../config/constants.js";
import { getServiceImage } from "../helpers/random.js";
import { BranchStatus, ServiceApprovalStatus } from "../../src/generated/prisma/client.js";
import { validateServiceSeed } from "../factories/service.factory.js";

export async function seedServices(seededBranchAdmins) {
  const serviceLookup = [];

  for (const { branchAdmin, branchSubmission } of seededBranchAdmins) {
    if (branchSubmission.status !== branchAdmin.status) {
      continue;
    }

    if (branchAdmin.status !== BranchStatus.APPROVED) {
      continue;
    }

    for (const servicePlan of SERVICE_PLANS) {
      await prisma.serviceCategory.upsert({
        where: {
          branchId_name: {
            branchId: branchAdmin.id,
            name: servicePlan.categoryName,
          },
        },
        update: {},
        create: {
          branchId: branchAdmin.id,
          name: servicePlan.categoryName,
        },
      });
    }

    for (const servicePlan of SERVICE_PLANS) {
      const category = await prisma.serviceCategory.findFirst({
        where: {
          branchId: branchAdmin.id,
          name: servicePlan.categoryName,
        },
      });

      if (!category) {
        continue;
      }

      const serviceName = `${servicePlan.serviceNamePrefix} ${branchAdmin.id}`;
      const existingService = await prisma.service.findFirst({
        where: {
          branchId: branchAdmin.id,
          serviceCategoryId: category.id,
          name: serviceName,
        },
      });

      const serviceData = validateServiceSeed({
        branchId: branchAdmin.id,
        serviceCategoryId: category.id,
        name: serviceName,
        description: servicePlan.description,
        price:
          servicePlan.status === ServiceApprovalStatus.APPROVED
            ? 150 + branchAdmin.id
            : servicePlan.status === ServiceApprovalStatus.PENDING_APPROVAL
              ? 250 + branchAdmin.id
              : 100 + branchAdmin.id,
        durationMinutes:
          servicePlan.status === ServiceApprovalStatus.APPROVED
            ? 30
            : servicePlan.status === ServiceApprovalStatus.PENDING_APPROVAL
              ? 45
              : 60,
        imageUrl: getServiceImage(branchSubmission.category, branchAdmin.id % 2),
        status: servicePlan.status,
        approvedAt:
          servicePlan.status === ServiceApprovalStatus.APPROVED
            ? dayjs().subtract(2, "day").toDate()
            : null,
        rejectionReason:
          servicePlan.status === ServiceApprovalStatus.REJECTED
            ? "Seeded rejected service scenario."
            : null,
      });

      if (existingService) {
        await prisma.service.update({
          where: { id: existingService.id },
          data: serviceData,
        });
      } else {
        await prisma.service.create({
          data: serviceData,
        });
      }
    }

    const approvedService = await prisma.service.findFirst({
      where: {
        branchId: branchAdmin.id,
        status: ServiceApprovalStatus.APPROVED,
      },
      select: { id: true },
    });

    const pendingService = await prisma.service.findFirst({
      where: {
        branchId: branchAdmin.id,
        status: ServiceApprovalStatus.PENDING_APPROVAL,
      },
      select: { id: true },
    });

    serviceLookup.push({
      branchId: branchAdmin.id,
      approvedServiceId: approvedService?.id ?? null,
      pendingServiceId: pendingService?.id ?? null,
    });
  }

  return { serviceLookup };
}
