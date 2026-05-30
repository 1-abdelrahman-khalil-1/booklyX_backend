import dayjs from "dayjs";
import { prisma } from "../helpers/prisma.js";
import { SERVICE_PLANS } from "../config/constants.js";
import { getServiceImage } from "../helpers/random.js";
import { BranchStatus, ServiceApprovalStatus } from "../../src/generated/prisma/client.js";
import { validateServiceSeed } from "../factories/service.factory.js";

export async function seedServices(seededBranchAdmins) {
  const serviceLookup = [];

  const CATEGORY_MAP = {
    BARBER: {
      categories: ["Haircuts", "Beard Grooming", "Shaving & Treatments"],
      services: [
        {
          name: "Classic Men's Haircut",
          categoryName: "Haircuts",
          description: "Professional clipper and scissor haircut tailored to your style, completed with a wash.",
          status: ServiceApprovalStatus.APPROVED,
        },
        {
          name: "Beard Trim & Hot Towel Shave",
          categoryName: "Beard Grooming",
          description: "Precision beard shaping followed by a relaxing hot towel treatment and straight razor shave.",
          status: ServiceApprovalStatus.PENDING_APPROVAL,
        },
        {
          name: "Premium Hair Coloring",
          categoryName: "Shaving & Treatments",
          description: "Full gray coverage or custom hair coloring service using top-grade products.",
          status: ServiceApprovalStatus.REJECTED,
        }
      ]
    },
    SPA: {
      categories: ["Massages", "Facial Care", "Body Treatments"],
      services: [
        {
          name: "Swedish Full Body Massage",
          categoryName: "Massages",
          description: "A deeply relaxing full body massage designed to relieve tension and improve circulation.",
          status: ServiceApprovalStatus.APPROVED,
        },
        {
          name: "Deep Cleansing Facial",
          categoryName: "Facial Care",
          description: "A skin-rejuvenating facial treatment that cleanses, exfoliates, and hydrates the skin.",
          status: ServiceApprovalStatus.PENDING_APPROVAL,
        },
        {
          name: "Hot Stone Therapy",
          categoryName: "Body Treatments",
          description: "Therapeutic massage using heated basalt stones to soothe sore muscles and release stress.",
          status: ServiceApprovalStatus.REJECTED,
        }
      ]
    },
    CLINIC: {
      categories: ["Consultations", "Diagnostics", "Specialized Treatments"],
      services: [
        {
          name: "General Health Consultation",
          categoryName: "Consultations",
          description: "Comprehensive medical check-up and consultation with our primary care physician.",
          status: ServiceApprovalStatus.APPROVED,
        },
        {
          name: "Dermatology Skin Screening",
          categoryName: "Diagnostics",
          description: "Detailed skin examination by a specialist dermatologist to check for any conditions.",
          status: ServiceApprovalStatus.PENDING_APPROVAL,
        },
        {
          name: "Premium Aesthetic Laser Therapy",
          categoryName: "Specialized Treatments",
          description: "Advanced non-invasive laser treatment for skin rejuvenation and correction.",
          status: ServiceApprovalStatus.REJECTED,
        }
      ]
    }
  };

  for (const { branchAdmin, branchSubmission } of seededBranchAdmins) {
    if (branchSubmission.status !== branchAdmin.status) {
      continue;
    }

    if (branchAdmin.status !== BranchStatus.APPROVED) {
      continue;
    }

    const branchCategory = branchSubmission.category || "SPA";
    const dataSpec = CATEGORY_MAP[branchCategory] || CATEGORY_MAP.SPA;

    for (const catName of dataSpec.categories) {
      await prisma.serviceCategory.upsert({
        where: {
          branchId_name: {
            branchId: branchAdmin.id,
            name: catName,
          },
        },
        update: {},
        create: {
          branchId: branchAdmin.id,
          name: catName,
        },
      });
    }

    for (const serviceSpec of dataSpec.services) {
      const category = await prisma.serviceCategory.findFirst({
        where: {
          branchId: branchAdmin.id,
          name: serviceSpec.categoryName,
        },
      });

      if (!category) {
        continue;
      }

      const serviceName = serviceSpec.name;
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
        description: serviceSpec.description,
        price:
          serviceSpec.status === ServiceApprovalStatus.APPROVED
            ? 150 + branchAdmin.id
            : serviceSpec.status === ServiceApprovalStatus.PENDING_APPROVAL
              ? 250 + branchAdmin.id
              : 100 + branchAdmin.id,
        durationMinutes:
          serviceSpec.status === ServiceApprovalStatus.APPROVED
            ? 30
            : serviceSpec.status === ServiceApprovalStatus.PENDING_APPROVAL
              ? 45
              : 60,
        imageUrl: getServiceImage(branchSubmission.category, branchAdmin.id % 2),
        status: serviceSpec.status,
        approvedAt:
          serviceSpec.status === ServiceApprovalStatus.APPROVED
            ? dayjs().subtract(2, "day").toDate()
            : null,
        rejectionReason:
          serviceSpec.status === ServiceApprovalStatus.REJECTED
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
