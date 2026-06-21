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
          price: 150,
          durationMinutes: 30,
        },
        {
          name: "Beard Trim & Hot Towel Shave",
          categoryName: "Beard Grooming",
          description: "Precision beard shaping followed by a relaxing hot towel treatment and straight razor shave.",
          status: ServiceApprovalStatus.PENDING_APPROVAL,
          price: 100,
          durationMinutes: 30,
        },
        {
          name: "Premium Hair Coloring",
          categoryName: "Shaving & Treatments",
          description: "Full gray coverage or custom hair coloring service using top-grade products.",
          status: ServiceApprovalStatus.REJECTED,
          price: 250,
          durationMinutes: 60,
        },
        {
          name: "Buzz Cut & Lineup",
          categoryName: "Haircuts",
          description: "Quick, clean buzz cut with razor edge lineup for sharp contours.",
          status: ServiceApprovalStatus.APPROVED,
          price: 80,
          durationMinutes: 20,
        },
        {
          name: "Beard Styling & Oil Treatment",
          categoryName: "Beard Grooming",
          description: "Shaping, trimming, and premium beard oil massage to nourish facial hair.",
          status: ServiceApprovalStatus.APPROVED,
          price: 70,
          durationMinutes: 20,
        },
        {
          name: "Scalp Treatment & Head Wash",
          categoryName: "Shaving & Treatments",
          description: "Exfoliating scalp scrub and therapeutic massage to clean and vitalize hair roots.",
          status: ServiceApprovalStatus.APPROVED,
          price: 120,
          durationMinutes: 25,
        },
        {
          name: "Kids Haircut & Style",
          categoryName: "Haircuts",
          description: "Trendy, quick haircut for kids under 12 in a friendly, relaxed setting.",
          status: ServiceApprovalStatus.APPROVED,
          price: 90,
          durationMinutes: 20,
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
          price: 300,
          durationMinutes: 60,
        },
        {
          name: "Deep Cleansing Facial",
          categoryName: "Facial Care",
          description: "A skin-rejuvenating facial treatment that cleanses, exfoliates, and hydrates the skin.",
          status: ServiceApprovalStatus.PENDING_APPROVAL,
          price: 250,
          durationMinutes: 45,
        },
        {
          name: "Hot Stone Therapy",
          categoryName: "Body Treatments",
          description: "Therapeutic massage using heated basalt stones to soothe sore muscles and release stress.",
          status: ServiceApprovalStatus.REJECTED,
          price: 400,
          durationMinutes: 75,
        },
        {
          name: "Aromatherapy Stress Relief",
          categoryName: "Massages",
          description: "Relaxing massage using customized organic essential oils to target stress zones.",
          status: ServiceApprovalStatus.APPROVED,
          price: 350,
          durationMinutes: 60,
        },
        {
          name: "Hydrating Facial Treatment",
          categoryName: "Facial Care",
          description: "Intense moisture-lock facial targeting dry skin to restore natural glow.",
          status: ServiceApprovalStatus.APPROVED,
          price: 220,
          durationMinutes: 45,
        },
        {
          name: "Dead Sea Mud Body Wrap",
          categoryName: "Body Treatments",
          description: "Full-body detoxifying mud wrap to nourish, smooth, and tighten skin.",
          status: ServiceApprovalStatus.APPROVED,
          price: 450,
          durationMinutes: 90,
        },
        {
          name: "Foot Reflexology Session",
          categoryName: "Massages",
          description: "Focused pressure-point therapy on feet to restore energy flow and soothe tired muscles.",
          status: ServiceApprovalStatus.APPROVED,
          price: 150,
          durationMinutes: 30,
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
          price: 200,
          durationMinutes: 15,
        },
        {
          name: "Dermatology Skin Screening",
          categoryName: "Diagnostics",
          description: "Detailed skin examination by a specialist dermatologist to check for any conditions.",
          status: ServiceApprovalStatus.PENDING_APPROVAL,
          price: 350,
          durationMinutes: 20,
        },
        {
          name: "Premium Aesthetic Laser Therapy",
          categoryName: "Specialized Treatments",
          description: "Advanced non-invasive laser treatment for skin rejuvenation and correction.",
          status: ServiceApprovalStatus.REJECTED,
          price: 800,
          durationMinutes: 45,
        },
        {
          name: "Cardiology Specialist Check",
          categoryName: "Consultations",
          description: "Targeted cardiac screening and advisor meeting with our consultant cardiologist.",
          status: ServiceApprovalStatus.APPROVED,
          price: 500,
          durationMinutes: 30,
        },
        {
          name: "Standard Blood Test Panel",
          categoryName: "Diagnostics",
          description: "Comprehensive lab test screening for core metabolic markers and vitamins.",
          status: ServiceApprovalStatus.APPROVED,
          price: 150,
          durationMinutes: 10,
        },
        {
          name: "Flu & Wellness Vaccination",
          categoryName: "Specialized Treatments",
          description: "Seasonal influenza vaccine shot and general immune system booster advice.",
          status: ServiceApprovalStatus.APPROVED,
          price: 100,
          durationMinutes: 10,
        },
        {
          name: "Nutrition & Lifestyle Advisory",
          categoryName: "Consultations",
          description: "Personalized dietary planning and medical lifestyle consulting with our nutritionist.",
          status: ServiceApprovalStatus.APPROVED,
          price: 250,
          durationMinutes: 30,
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

    let serviceIndex = 0;
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
        price: serviceSpec.price,
        durationMinutes: serviceSpec.durationMinutes,
        imageUrl: getServiceImage(branchSubmission.category, serviceIndex),
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
      serviceIndex++;
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
