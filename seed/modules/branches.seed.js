import { hashPassword } from "../helpers/bcrypt.js";
import { prisma } from "../helpers/prisma.js";
import { SEED_BRANCH_DOCUMENT_TYPES } from "../config/constants.js";
import { getBranchDocumentUrl } from "../helpers/random.js";
import { AvailabilityStatus, BranchStatus, Role, UserStatus, VerificationType } from "../../src/generated/prisma/client.js";

function buildDefaultBranchAvailabilityRows(branchAdminId) {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    branchAdminId,
    dayOfWeek,
    startTime: "09:00",
    endTime: "17:00",
    status: AvailabilityStatus.AVAILABLE,
  }));
}

export async function seedBranches({ starterPlan, branchSubmissions }) {
  let branchAdminTableExists = true;
  try {
    await prisma.branchAdmin.count();
  } catch {
    branchAdminTableExists = false;
  }

  if (!branchAdminTableExists) {
    return { skipped: true };
  }

  const seededApprovedBranches = [];
  const seededBranchAdmins = [];

  for (const branchSubmission of branchSubmissions) {
    const ownerPasswordHash = await hashPassword(branchSubmission.password);

    const branchAdminUser = await prisma.user.upsert({
      where: { email: branchSubmission.email },
      update: {
        name: branchSubmission.ownerName,
        password: ownerPasswordHash,
        phone: branchSubmission.phone,
        role: Role.branch_admin,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
      },
      create: {
        name: branchSubmission.ownerName,
        email: branchSubmission.email,
        password: ownerPasswordHash,
        phone: branchSubmission.phone,
        role: Role.branch_admin,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
      },
    });

    const existingBranchSubmission = await prisma.branchAdmin.findFirst({
      where: {
        email: branchSubmission.email,
        phone: branchSubmission.phone,
      },
    });

    let branchAdmin;
    if (existingBranchSubmission) {
      branchAdmin = await prisma.branchAdmin.update({
        where: { id: existingBranchSubmission.id },
        data: {
          ownerName: branchSubmission.ownerName,
          planId: existingBranchSubmission.planId ?? starterPlan.id,
          passwordHash: ownerPasswordHash,
          businessName: branchSubmission.businessName,
          category: branchSubmission.category,
          description: branchSubmission.description,
          commercialRegisterNumber: branchSubmission.commercialRegisterNumber,
          taxId: branchSubmission.taxId,
          city: branchSubmission.city,
          district: branchSubmission.district,
          address: branchSubmission.address,
          latitude: branchSubmission.latitude,
          longitude: branchSubmission.longitude,
          status: branchSubmission.status,
          emailVerified: true,
          phoneVerified: true,
          rejectionReason: branchSubmission.rejectionReason,
          userId: branchAdminUser.id,
        },
      });
    } else {
      branchAdmin = await prisma.branchAdmin.create({
        data: {
          ownerName: branchSubmission.ownerName,
          email: branchSubmission.email,
          phone: branchSubmission.phone,
          planId: starterPlan.id,
          passwordHash: ownerPasswordHash,
          businessName: branchSubmission.businessName,
          category: branchSubmission.category,
          description: branchSubmission.description,
          commercialRegisterNumber: branchSubmission.commercialRegisterNumber,
          taxId: branchSubmission.taxId,
          city: branchSubmission.city,
          district: branchSubmission.district,
          address: branchSubmission.address,
          latitude: branchSubmission.latitude,
          longitude: branchSubmission.longitude,
          status: branchSubmission.status,
          emailVerified: true,
          phoneVerified: true,
          rejectionReason: branchSubmission.rejectionReason,
          userId: branchAdminUser.id,
        },
      });
    }

    seededBranchAdmins.push({
      branchAdmin,
      branchSubmission,
      branchAdminUser,
    });

    if (branchSubmission.status === BranchStatus.APPROVED) {
      seededApprovedBranches.push({
        id: branchAdmin.id,
        planId: branchAdmin.planId,
      });
    }

    await prisma.branchDocument.deleteMany({
      where: { branchAdminId: branchAdmin.id },
    });

    const documentTypes =
      branchSubmission.status === BranchStatus.APPROVED
        ? SEED_BRANCH_DOCUMENT_TYPES
        : SEED_BRANCH_DOCUMENT_TYPES.slice(0, 2);

    await prisma.branchDocument.createMany({
      data: documentTypes.map((documentType) => ({
        branchAdminId: branchAdmin.id,
        type: documentType,
        fileUrl: getBranchDocumentUrl(documentType),
      })),
    });

    await prisma.branchVerificationCode.deleteMany({
      where: { branchAdminId: branchAdmin.id },
    });

    const verificationCodes = [
      {
        type: VerificationType.EMAIL,
        code: `APP-EMAIL-${String(branchAdmin.id).padStart(2, "0")}-111111`,
      },
      {
        type: VerificationType.PHONE,
        code: `APP-PHONE-${String(branchAdmin.id).padStart(2, "0")}-222222`,
      },
      {
        type: VerificationType.PASSWORD_RESET,
        code: `APP-RESET-${String(branchAdmin.id).padStart(2, "0")}-333333`,
      },
    ];

    await Promise.all(
      verificationCodes.map(async (verificationCode) => {
        const codeHash = await hashPassword(verificationCode.code);
        return prisma.branchVerificationCode.create({
          data: {
            branchAdminId: branchAdmin.id,
            type: verificationCode.type,
            codeHash,
            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            used: false,
            attempts: 0,
          },
        });
      }),
    );

    if (branchSubmission.status === BranchStatus.APPROVED) {
      await prisma.branchAvailability.deleteMany({
        where: { branchAdminId: branchAdmin.id },
      });

      await prisma.branchAvailability.createMany({
        data: buildDefaultBranchAvailabilityRows(branchAdmin.id),
      });
    }
  }

  return { branchSubmissions, seededApprovedBranches, seededBranchAdmins };
}
