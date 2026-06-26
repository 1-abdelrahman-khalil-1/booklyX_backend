import bcrypt from "bcrypt";
import { Role, UserStatus } from "../../generated/prisma/client.js";
import prisma from "../../lib/prisma.js";
import { CODE_EXPIRES_MINUTES, FIXED_OTP_CODE, MAX_ATTEMPTS, SALT_ROUNDS } from "./constants.js";
import {
    DuplicateBranchAdminUserError,
    InvalidOTPError,
    MaxAttemptsExceededError,
    OTPExpiredError
} from "./errors.js";

export function firstUploadedFile(req, fieldName) {
  const fileList = req.files?.[fieldName];
  return Array.isArray(fileList) ? fileList[0] : undefined;
}

export function getUploadedFileUrl(file) {
  return file?.path ?? undefined;
}

export function buildBranchPayload(req) {
  return {
    ...req.body,
    logoUrl: getUploadedFileUrl(firstUploadedFile(req, "logo")) ?? req.body.logoUrl,
    taxCertificateUrl:
      getUploadedFileUrl(firstUploadedFile(req, "taxCertificate")) ?? req.body.taxCertificateUrl,
    commercialRegisterUrl:
      getUploadedFileUrl(firstUploadedFile(req, "commercialRegister")) ?? req.body.commercialRegisterUrl,
    nationalIdUrl:
      getUploadedFileUrl(firstUploadedFile(req, "nationalId")) ?? req.body.nationalIdUrl,
    facilityLicenseUrl:
      getUploadedFileUrl(firstUploadedFile(req, "facilityLicense")) ?? req.body.facilityLicenseUrl,
  };
}

export function buildServicePayload(req) {
  return {
    ...req.body,
    imageUrl: getUploadedFileUrl(firstUploadedFile(req, "image")) ?? req.body.imageUrl,
  };
}

export async function ensureBranchAdminUserAccount(branchAdminId, tx , preferredUserId) {
  const branchAdmin = await tx.branchAdmin.findUnique({
    where: { id: branchAdminId },
    select: {
      id: true,
      userId: true,
      ownerName: true,
      email: true,
      phone: true,
      passwordHash: true,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  if (!branchAdmin) {
    throw new Error("BRANCH_ADMIN_NOT_FOUND");
  }

  if (branchAdmin.userId) {
    return branchAdmin.userId;
  }

  if (preferredUserId) {
    const preferredUser = await tx.user.findUnique({
      where: { id: preferredUserId },
      select: { id: true, email: true, phone: true, role: true },
    });

    if (
      preferredUser &&
      preferredUser.role === Role.branch_admin &&
      preferredUser.email === branchAdmin.email &&
      preferredUser.phone === branchAdmin.phone
    ) {
      await tx.user.update({
        where: { id: preferredUser.id },
        data: {
          name: branchAdmin.ownerName,
          password: branchAdmin.passwordHash,
          status: UserStatus.ACTIVE,
          emailVerified: branchAdmin.emailVerified,
          phoneVerified: branchAdmin.phoneVerified,
        },
      });

      await tx.branchAdmin.update({
        where: { id: branchAdmin.id },
        data: { userId: preferredUser.id },
      });

      return preferredUser.id;
    }
  }

  const existingUser = await tx.user.findFirst({
    where: {
      OR: [{ email: branchAdmin.email }, { phone: branchAdmin.phone }],
    },
    select: { id: true, email: true, phone: true, role: true },
  });

  if (existingUser) {
    const isExactMatch =
      existingUser.email === branchAdmin.email &&
      existingUser.phone === branchAdmin.phone &&
      existingUser.role === Role.branch_admin;

    if (!isExactMatch) {
      throw new DuplicateBranchAdminUserError();
    }

    await tx.user.update({
      where: { id: existingUser.id },
      data: {
        name: branchAdmin.ownerName,
        password: branchAdmin.passwordHash,
        status: UserStatus.ACTIVE,
        emailVerified: branchAdmin.emailVerified,
        phoneVerified: branchAdmin.phoneVerified,
      },
    });

    await tx.branchAdmin.update({
      where: { id: branchAdmin.id },
      data: { userId: existingUser.id },
    });

    return existingUser.id;
  }

  const createdUser = await tx.user.create({
    data: {
      name: branchAdmin.ownerName,
      email: branchAdmin.email,
      password: branchAdmin.passwordHash,
      phone: branchAdmin.phone,
      role: Role.branch_admin,
      status: UserStatus.ACTIVE,
      emailVerified: branchAdmin.emailVerified,
      phoneVerified: branchAdmin.phoneVerified,
    },
    select: { id: true },
  });

  await tx.branchAdmin.update({
    where: { id: branchAdmin.id },
    data: { userId: createdUser.id },
  });

  return createdUser.id;
}

export function buildStaffPayload(req) {
  return {
    ...req.body,
    profileImageUrl: getUploadedFileUrl(firstUploadedFile(req, "profile_image")) ?? req.body.profileImageUrl,
  };
}

export function buildProfilePayload(req) {
  return {
    ...req.body,
    logoUrl: getUploadedFileUrl(firstUploadedFile(req, "logo")) ?? req.body.logoUrl,
  };
}

export function mapServiceResponse(service) {
  return {
    id: service.id,
    branchId: service.branchId,
    serviceCategoryId: service.serviceCategoryId,
    name: service.name,
    description: service.description,
    price: service.price,
    duration_minutes: service.durationMinutes,
    duration: service.duration ?? service.durationMinutes,
    imageUrl: service.imageUrl,
    status: service.status,
    rejectionReason: service.rejectionReason ?? null,
    approvedAt: service.approvedAt ?? null,
    updatedAt: service.updatedAt ?? null,
    createdAt: service.createdAt ?? null,
    category: service.category ?? null,
    staff: Array.isArray(service.staffLinks)
      ? service.staffLinks
        .filter((staffLink) => staffLink.staff?.user)
        .map((staffLink) => ({
          id: staffLink.staff.id,
          userId: staffLink.staff.userId,
          name: staffLink.staff.user.name,
          profileImageUrl: staffLink.staff.profileImageUrl ?? null,
          staffRole: staffLink.staff.staffRole,
          averageRating: staffLink.staff.averageRating,
          totalReviews: staffLink.staff.reviewCount,
          isActive: staffLink.staff.isActive,
        }))
      : undefined,
  };
}

export function buildBranchProfileSelect() {
  return {
    id: true,
    ownerName: true,
    email: true,
    phone: true,
    businessName: true,
    category: true,
    description: true,
    logoUrl: true,
    operatingHours: true,
    address: true,
    city: true,
    district: true,
    status: true,
    isSubscriptionActive: true,
    subscriptionStartedAt: true,
    emailVerified: true,
    phoneVerified: true,
    createdAt: true,
    updatedAt: true,
    allowCancellationBeforeHours: true,
    bookingNotificationsEnabled: true,
    marketingNotificationsEnabled: true,
    plan: {
      select: {
        id: true,
        name: true,
        price: true,
        maxStaff: true,
        maxServices: true,
        loyaltyEnabled: true,
        offersEnabled: true,
      },
    },
    branchAvailabilities: {
      select: {
        id: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    },
  };
}

export function buildPublicBranchProfileSelect() {
  return {
    id: true,
    businessName: true,
    category: true,
    description: true,
    logoUrl: true,
    city: true,
    district: true,
    address: true,
    status: true,
    isSubscriptionActive: true,
    subscriptionStartedAt: true,
    averageRating: true,
    reviewCount: true,
    allowCancellationBeforeHours: true,
    bookingNotificationsEnabled: true,
    marketingNotificationsEnabled: true,
    plan: {
      select: {
        id: true,
        name: true,
        price: true,
        maxStaff: true,
        maxServices: true,
        loyaltyEnabled: true,
        offersEnabled: true,
      },
    },
    branchAvailabilities: {
      select: {
        id: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    },
  };
}

export function buildStaffUserSelect() {
  return {
    id: true,
    name: true,
    email: true,
    phone: true,
    role: true,
    status: true,
    emailVerified: true,
    phoneVerified: true,
    createdAt: true,
    updatedAt: true,
    staff: {
      select: {
        id: true,
        isActive: true,
        age: true,
        startDate: true,
        staffRole: true,
        profileImageUrl: true,
        commissionPercentage: true,
        services: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                price: true,
                durationMinutes: true,
                status: true,
              },
            },
          },
        },
      },
    },
  };
}

export function buildDetailedStaffUserSelect() {
  return {
    id: true,
    name: true,
    email: true,
    phone: true,
    role: true,
    status: true,
    emailVerified: true,
    phoneVerified: true,
    createdAt: true,
    updatedAt: true,
    staff: {
      select: {
        id: true,
        isActive: true,
        age: true,
        startDate: true,
        staffRole: true,
        profileImageUrl: true,
        commissionPercentage: true,
        averageRating: true,
        reviewCount: true,
        createdAt: true,
        updatedAt: true,
        professionalProfile: {
          select: {
            id: true,
            bio: true,
            yearsOfExperience: true,
            licenseNumber: true,
            specialization: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        certificates: {
          select: {
            id: true,
            title: true,
            issuer: true,
            issueDate: true,
            expiryDate: true,
            fileUrl: true,
            createdAt: true,
          },
        },
        availabilities: {
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            status: true,
          },
        },
        services: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                price: true,
                durationMinutes: true,
                status: true,
              },
            },
          },
        },
      },
    },
  };
}

export async function findLatestBranchByEmail(email) {
  return prisma.branchAdmin.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      status: true,
      emailVerified: true,
      phoneVerified: true,
    },
  });
}

export function generateOtpCode() {
  return FIXED_OTP_CODE;
}

export async function createBranchOtp(branchId, type) {
  await prisma.branchVerificationCode.deleteMany({
    where: { branchAdminId: branchId, type, used: false },
  });

  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + CODE_EXPIRES_MINUTES);

  await prisma.branchVerificationCode.create({
    data: { branchAdminId: branchId, type, codeHash, expiresAt },
  });

  return code;
}

export async function consumeBranchOtp(branchId, type, code) {
  const record = await prisma.branchVerificationCode.findFirst({
    where: { branchAdminId: branchId, type, used: false },
    orderBy: { createdAt: "desc" },
  });

  if (!record) throw new InvalidOTPError();
  if (record.attempts >= MAX_ATTEMPTS) throw new MaxAttemptsExceededError();
  if (new Date() > record.expiresAt) throw new OTPExpiredError();

  const isValid = await bcrypt.compare(code, record.codeHash);
  if (!isValid) {
    await prisma.branchVerificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new InvalidOTPError();
  }

  await prisma.branchVerificationCode.update({
    where: { id: record.id },
    data: { used: true },
  });
}
