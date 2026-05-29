import bcrypt from "bcrypt";
import dayjs from "dayjs";
import {
  AppointmentStatus,
  AvailabilityStatus,
  BranchStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  Role,
  ServiceApprovalStatus,
  UserStatus,
  VerificationType,
} from "../../generated/prisma/client.js";
import {
  sendEmailVerification,
  sendPhoneVerificationCode,
} from "../../lib/email.js";
import { tr } from "../../lib/i18n/index.js";
import {
  mapBranchAdminProfile,
  mapBranchPublicProfile,
} from "../../lib/mappers/profile.mapper.js";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { toRangeWhere } from "../../utils/period.js";
import {
  ensureActiveSubscription,
  ensureServiceLimitNotExceeded,
  ensureStaffLimitNotExceeded,
} from "../../utils/subscriptionGuards.js";


const SALT_ROUNDS = 10;
const FIXED_OTP_CODE = process.env.FIXED_OTP_CODE || "333333";
const CODE_EXPIRES_MINUTES = parseInt(
  process.env.VERIFICATION_CODE_EXPIRES_MINUTES || "10",
  10,
);
const MAX_ATTEMPTS = 5;
const DEFAULT_BRANCH_OPEN_TIME = "09:00";
const DEFAULT_BRANCH_CLOSE_TIME = "17:00";

function mapServiceResponse(service) {
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
  };
}

function buildBranchProfileSelect() {
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

function buildPublicBranchProfileSelect() {
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

export class BranchAdminValidationError extends AppError {
  constructor(message, params) {
    super(message, 400, params);
    this.name = "BranchAdminValidationError";
  }
}

export class BranchNotFoundError extends AppError {
  constructor() {
    super(tr.BRANCH_NOT_FOUND, 404);
    this.name = "BranchNotFoundError";
  }
}

export class SubscriptionAlreadyActiveError extends AppError {
  constructor() {
    super(tr.SUBSCRIPTION_ALREADY_ACTIVE, 409);
    this.name = "SubscriptionAlreadyActiveError";
  }
}

export class SubscriptionActivationForbiddenError extends AppError {
  constructor() {
    super(tr.SUBSCRIPTION_ACTIVATION_FORBIDDEN, 403);
    this.name = "SubscriptionActivationForbiddenError";
  }
}

export class DuplicateBranchAdminUserError extends AppError {
  constructor() {
    super(tr.DUPLICATE_ACCOUNT, 409);
    this.name = "DuplicateBranchAdminUserError";
  }
}

export class BranchNotPendingApprovalError extends AppError {
  constructor() {
    super(tr.BRANCH_IS_UNDER_REVIEW, 409);
    this.name = "BranchNotPendingApprovalError";
  }
}

export class InvalidPlanError extends AppError {
  constructor() {
    super(tr.INVALID_PLAN, 400);
    this.name = "InvalidPlanError";
  }
}

export class InactivePlanError extends AppError {
  constructor() {
    super(tr.INACTIVE_PLAN, 400);
    this.name = "InactivePlanError";
  }
}

export class OTPExpiredError extends AppError {
  constructor() {
    super(tr.OTP_EXPIRED, 400);
    this.name = "OTPExpiredError";
  }
}

export class InvalidOTPError extends AppError {
  constructor() {
    super(tr.OTP_INVALID, 400);
    this.name = "InvalidOTPError";
  }
}

export class MaxAttemptsExceededError extends AppError {
  constructor() {
    super(tr.MAX_ATTEMPTS_EXCEEDED, 429);
    this.name = "MaxAttemptsExceededError";
  }
}

export class ServiceCategoryNotFoundError extends AppError {
  constructor() {
    super(tr.CATEGORY_REQUIRED, 400);
    this.name = "ServiceCategoryNotFoundError";
  }
}

export class StaffNotFoundError extends AppError {
  constructor() {
    super(tr.STAFF_NOT_FOUND, 404);
    this.name = "StaffNotFoundError";
  }
}

export class AppointmentNotFoundError extends AppError {
  constructor() {
    super(tr.APPOINTMENT_NOT_FOUND, 404);
    this.name = "AppointmentNotFoundError";
  }
}

export class AppointmentAccessError extends AppError {
  constructor() {
    super(tr.APPOINTMENT_ACCESS_DENIED, 403);
    this.name = "AppointmentAccessError";
  }
}

export class BranchAvailabilityNotFoundError extends AppError {
  constructor() {
    super(tr.BRANCH_AVAILABILITY_NOT_FOUND, 404);
    this.name = "BranchAvailabilityNotFoundError";
  }
}

export class ServiceDependencyError extends AppError {
  constructor() {
    super(tr.SERVICE_HAS_DEPENDENCIES, 409);
    this.name = "ServiceDependencyError";
  }
}

export class SubscriptionCancellationError extends AppError {
  constructor() {
    super(tr.INVALID_SUBSCRIPTION_CANCELLATION, 409);
    this.name = "SubscriptionCancellationError";
  }
}

export class BookingPaymentNotFoundError extends AppError {
  constructor() {
    super(tr.PAYMENT_NOT_FOUND, 404);
    this.name = "BookingPaymentNotFoundError";
  }
}

export class BookingPaymentAccessError extends AppError {
  constructor() {
    super(tr.PAYMENT_ACCESS_DENIED, 403);
    this.name = "BookingPaymentAccessError";
  }
}

export class AppointmentCancellationError extends AppError {
  constructor() {
    super(tr.APPOINTMENT_CANCELLATION_NOT_ALLOWED, 409);
    this.name = "AppointmentCancellationError";
  }
}

export class PlanNotFoundError extends AppError {
  constructor() {
    super(tr.PLAN_NOT_FOUND, 404);
    this.name = "PlanNotFoundError";
  }
}

const staffUserSelect = {
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
    include: {
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

async function findLatestBranchByEmail(email) {
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

function generateOtpCode() {
  // TODO: Replace with secure random OTP generation when SMS/email provider is fully enabled.
  return FIXED_OTP_CODE;
}

async function createBranchOtp(branchId, type) {
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

async function consumeBranchOtp(branchId, type, code) {
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

export async function submitBranch(data) {
  const plan = await prisma.plan.findUnique({
    where: { id: data.planId },
    select: { id: true, isActive: true },
  });

  if (!plan) {
    throw new InvalidPlanError();
  }

  if (!plan.isActive) {
    throw new InactivePlanError();
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  let branchSubmission;
  try {
    branchSubmission = await prisma.$transaction(async (tx) => {
      const [existingUser, existingBranchSubmissions] = await Promise.all([
        tx.user.findFirst({
          where: {
            OR: [{ email: data.email }, { phone: data.phone }],
          },
          select: { id: true },
        }),
        tx.branchAdmin.findMany({
          where: { OR: [{ email: data.email }, { phone: data.phone }] },
          select: { id: true, status: true },
        }),
      ]);

      if (existingUser) {
        throw new DuplicateBranchAdminUserError();
      }

      if (existingBranchSubmissions.length > 0) {
        const hasActiveBranchSubmission = existingBranchSubmissions.some(
          (existingBranchSubmission) =>
            existingBranchSubmission.status !== BranchStatus.REJECTED,
        );

        if (hasActiveBranchSubmission) {
          throw new DuplicateBranchAdminUserError();
        }

        await tx.branchAdmin.deleteMany({
          where: {
            id: { in: existingBranchSubmissions.map((existingBranchSubmission) => existingBranchSubmission.id) },
          },
        });
      }

      return tx.branchAdmin.create({
        data: {
          planId: data.planId,
          ownerName: data.ownerName,
          email: data.email,
          phone: data.phone,
          passwordHash,
          businessName: data.businessName,
          category: data.category,
          description: data.description,
          commercialRegisterNumber: data.commercialRegisterNumber,
          taxId: data.taxId,
          logoUrl: data.logoUrl,
          taxCertificateUrl: data.taxCertificateUrl,
          commercialRegisterUrl: data.commercialRegisterUrl,
          nationalIdUrl: data.nationalIdUrl,
          facilityLicenseUrl: data.facilityLicenseUrl,
          city: data.city,
          district: data.district,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          userId: null,
          status: BranchStatus.PENDING_VERIFICATION,
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new DuplicateBranchAdminUserError();
    }
    throw error;
  }

  const code = await createBranchOtp(
    branchSubmission.id,
    VerificationType.EMAIL,
  );
  await sendEmailVerification(branchSubmission.email, code);
  const { passwordHash: _passwordHash, ...rest } = branchSubmission;
  return { message: tr.BRANCH_SUBMITTED, branch: rest };
}

export async function verifyBranchEmail(email, code) {
  const branchSubmission = await findLatestBranchByEmail(email);
  if (!branchSubmission) throw new BranchNotFoundError();

  if (branchSubmission.emailVerified) return { message: tr.EMAIL_ALREADY_VERIFIED };

  // Only allow verification when the branch submission is actually pending verification
  if (branchSubmission.status !== BranchStatus.PENDING_VERIFICATION) {
    throw new BranchNotPendingApprovalError();
  }

  await consumeBranchOtp(
    branchSubmission.id,
    VerificationType.EMAIL,
    code,
  );

  const updatedRows = await prisma.branchAdmin.updateMany({
    where: {
      id: branchSubmission.id,
      status: BranchStatus.PENDING_VERIFICATION,
      emailVerified: false,
    },
    data: { emailVerified: true },
  });

  if (updatedRows.count === 0) {
    throw new BranchNotPendingApprovalError();
  }

  const phoneCode = await createBranchOtp(
    branchSubmission.id,
    VerificationType.PHONE,
  );
  await sendPhoneVerificationCode(email, phoneCode);

  return { message: tr.EMAIL_VERIFIED_SUCCESS };
}

export async function verifyBranchPhone(email, code) {
  const branchSubmission = await findLatestBranchByEmail(email);
  if (!branchSubmission) throw new BranchNotFoundError();

  if (branchSubmission.phoneVerified) return { message: tr.PHONE_ALREADY_VERIFIED };

  if (!branchSubmission.emailVerified) {
    throw new BranchAdminValidationError(tr.EMAIL_NOT_VERIFIED);
  }

  if (branchSubmission.status !== BranchStatus.PENDING_VERIFICATION) {
    throw new BranchNotPendingApprovalError();
  }

  await consumeBranchOtp(
    branchSubmission.id,
    VerificationType.PHONE,
    code,
  );

  const updatedRows = await prisma.branchAdmin.updateMany({
    where: {
      id: branchSubmission.id,
      status: BranchStatus.PENDING_VERIFICATION,
      emailVerified: true,
      phoneVerified: false,
    },
    data: { phoneVerified: true, status: BranchStatus.PENDING_APPROVAL },
  });

  if (updatedRows.count === 0) {
    throw new BranchNotPendingApprovalError();
  }

  return { message: tr.BRANCH_UNDER_REVIEW };
}

export async function resendBranchCode(email, type) {
  const branchSubmission = await findLatestBranchByEmail(email);
  if (!branchSubmission) throw new BranchNotFoundError();

  if (branchSubmission.status !== BranchStatus.PENDING_VERIFICATION) {
    throw new BranchNotPendingApprovalError();
  }

  if (type === VerificationType.EMAIL && branchSubmission.emailVerified) {
    throw new BranchAdminValidationError(tr.EMAIL_ALREADY_VERIFIED);
  }

  if (type === VerificationType.PHONE && !branchSubmission.emailVerified) {
    throw new BranchAdminValidationError(tr.EMAIL_NOT_VERIFIED);
  }

  if (type === VerificationType.PHONE && branchSubmission.phoneVerified) {
    throw new BranchAdminValidationError(tr.PHONE_ALREADY_VERIFIED);
  }

  const newCode = await createBranchOtp(branchSubmission.id, type);

  if (type === VerificationType.EMAIL) {
    await sendEmailVerification(branchSubmission.email, newCode);
  } else {
    await sendPhoneVerificationCode(branchSubmission.email, newCode);
  }

  return { message: tr.VERIFICATION_CODE_SENT };
}

export async function createStaff(data, branchAdminUserId) {

  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: {
      id: true,
      status: true,
      isSubscriptionActive: true,
      branchAvailabilities: {
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          status: true,
        },
        orderBy: { dayOfWeek: "asc" },
      },
      plan: {
        select: {
          id: true,
          maxStaff: true,
          maxServices: true,
          offersEnabled: true,
          loyaltyEnabled: true,
        },
      },
    },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  if (branchAdmin.status !== BranchStatus.APPROVED) {
    throw new BranchAdminValidationError(tr.BRANCH_IS_UNDER_REVIEW);
  }

  await ensureStaffLimitNotExceeded(branchAdmin.id, branchAdmin);

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: data.email }, { phone: data.phone }],
    },
    select: { email: true, phone: true },
  });

  if (existingUser) {
    if (existingUser.email === data.email) {
      throw new BranchAdminValidationError(tr.DUPLICATE_EMAIL);
    }
    throw new BranchAdminValidationError(tr.DUPLICATE_PHONE);
  }

  const uniqueServiceIds = [...new Set(data.serviceIds)];
  const approvedServices = await prisma.service.findMany({
    where: {
      id: { in: uniqueServiceIds },
      branchId: branchAdmin.id,
      status: ServiceApprovalStatus.APPROVED,
    },
    select: { id: true },
  });

  if (approvedServices.length !== uniqueServiceIds.length) {
    throw new BranchAdminValidationError(tr.INVALID_STAFF_SERVICE_SELECTION);
  }

  const branchAvailabilities =
    branchAdmin.branchAvailabilities && branchAdmin.branchAvailabilities.length > 0
      ? branchAdmin.branchAvailabilities
      : Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        startTime: DEFAULT_BRANCH_OPEN_TIME,
        endTime: DEFAULT_BRANCH_CLOSE_TIME,
        status: AvailabilityStatus.AVAILABLE,
      }));

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
        role: Role.staff,
        status: UserStatus.ACTIVE,
        staff: {
          create: {
            branchId: branchAdmin.id,
            profileImageUrl: data.profileImageUrl,
            age: data.age,
            startDate: new Date(data.startDate),
            staffRole: data.staffRole,
            commissionPercentage: data.commissionPercentage,
            availabilities: {
              create: branchAvailabilities.map((availability) => ({
                dayOfWeek: availability.dayOfWeek,
                startTime: availability.startTime,
                endTime: availability.endTime,
                status: availability.status,
              })),
            },
            services: {
              create: uniqueServiceIds.map((serviceId) => ({
                service: { connect: { id: serviceId } },
              })),
            },
          },
        },
      },
      include: {
        staff: staffUserSelect.staff,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new BranchAdminValidationError(tr.DUPLICATE_ACCOUNT);
    }
    throw error;
  }

  const { password: _password, ...safeUser } = user;
  return safeUser;
}

export async function getMyStaff(branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  const users = await prisma.user.findMany({
    where: {
      role: Role.staff,
      staff: {
        is: {
          branchId: branchAdmin.id,
          isActive: true,
        },
      },
    },
    select: staffUserSelect,
    orderBy: { createdAt: "desc" },
  });

  return users;
}

export async function getMyStaffById(staffId, branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  const staff = await prisma.user.findFirst({
    where: {
      id: staffId,
      role: Role.staff,
      staff: {
        is: {
          branchId: branchAdmin.id,
          isActive: true,
        },
      },
    },
    select: staffUserSelect,
  });

  if (!staff) {
    throw new StaffNotFoundError();
  }

  return staff;
}

export async function updateStaff(data, branchAdminUserId) {

  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  const staff = await prisma.user.findFirst({
    where: {
      id: data.id,
      role: Role.staff,
      staff: {
        is: {
          branchId: branchAdmin.id,
          isActive: true,
        },
      },
    },
    select: {
      id: true,
      email: true,
      phone: true,
      staff: {
        select: { id: true },
      },
    },
  });

  if (!staff || !staff.staff) {
    throw new StaffNotFoundError();
  }

  const staffId = staff.staff.id;

  if (data.email || data.phone) {
    const duplicateUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(data.email ? [{ email: data.email }] : []),
          ...(data.phone ? [{ phone: data.phone }] : []),
        ],
        NOT: { id: staff.id },
      },
      select: { email: true, phone: true },
    });

    if (duplicateUser) {
      if (duplicateUser.email === data.email) {
        throw new BranchAdminValidationError(tr.DUPLICATE_EMAIL);
      }
      if (duplicateUser.phone === data.phone) {
        throw new BranchAdminValidationError(tr.DUPLICATE_PHONE);
      }
      throw new BranchAdminValidationError(tr.DUPLICATE_ACCOUNT);
    }
  }

  let uniqueServiceIds = [];
  if (data.serviceIds) {
    uniqueServiceIds = [...new Set(data.serviceIds)];
    const approvedServices = await prisma.service.findMany({
      where: {
        id: { in: uniqueServiceIds },
        branchId: branchAdmin.id,
        status: ServiceApprovalStatus.APPROVED,
      },
      select: { id: true },
    });

    if (approvedServices.length !== uniqueServiceIds.length) {
      throw new BranchAdminValidationError(tr.INVALID_STAFF_SERVICE_SELECTION);
    }
  }

  const userUpdateData = {};
  if (data.name !== undefined) userUpdateData.name = data.name;
  if (data.email !== undefined) userUpdateData.email = data.email;
  if (data.phone !== undefined) userUpdateData.phone = data.phone;

  const staffUpdateData = {};
  if (data.age !== undefined) staffUpdateData.age = data.age;
  if (data.startDate !== undefined) {
    staffUpdateData.startDate = new Date(data.startDate);
  }
  if (data.staffRole !== undefined) staffUpdateData.staffRole = data.staffRole;
  if (data.profileImageUrl !== undefined) {
    staffUpdateData.profileImageUrl = data.profileImageUrl;
  }
  if (data.commissionPercentage !== undefined) {
    staffUpdateData.commissionPercentage = data.commissionPercentage;
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(userUpdateData).length > 0) {
      await tx.user.update({
        where: { id: staff.id },
        data: userUpdateData,
      });
    }

    if (Object.keys(staffUpdateData).length > 0) {
      await tx.staff.update({
        where: { userId: staff.id },
        data: staffUpdateData,
      });
    }

    if (data.serviceIds) {
      await tx.staffService.deleteMany({
        where: { staffId },
      });

      await tx.staffService.createMany({
        data: uniqueServiceIds.map((serviceId) => ({
          staffId,
          serviceId,
        })),
      });
    }
  });

  return getMyStaffById(staff.id, branchAdminUserId);
}

export async function deleteStaff(id, branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  const staff = await prisma.user.findFirst({
    where: {
      id,
      role: Role.staff,
      staff: {
        is: {
          branchId: branchAdmin.id,
          isActive: true,
        },
      },
    },
    select: { id: true },
  });

  if (!staff) {
    throw new StaffNotFoundError();
  }

  await prisma.$transaction(async (tx) => {
    await tx.staff.update({
      where: { userId: staff.id },
      data: { isActive: false },
    });

    await tx.user.update({
      where: { id: staff.id },
      data: { status: UserStatus.INACTIVE },
    });
  });

  return { message: tr.STAFF_DELETED };
}

export async function addServiceCategory(data, branchAdminUserId) {

  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  if (branchAdmin.status !== BranchStatus.APPROVED) {
    throw new BranchAdminValidationError(tr.BRANCH_IS_UNDER_REVIEW);
  }

  const normalizedName = data.name.trim();

  const category = await prisma.serviceCategory.upsert({
    where: {
      branchId_name: {
        branchId: branchAdmin.id,
        name: normalizedName,
      },
    },
    create: {
      branchId: branchAdmin.id,
      name: normalizedName,
    },
    update: {},
  });

  return category;
}

export async function getMyServiceCategories(branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

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
      plan: {
        select: {
          id: true,
          maxStaff: true,
          maxServices: true,
          offersEnabled: true,
          loyaltyEnabled: true,
        },
      },
    },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  if (branchAdmin.status !== BranchStatus.APPROVED) {
    throw new BranchAdminValidationError(tr.BRANCH_IS_UNDER_REVIEW);
  }

  await ensureServiceLimitNotExceeded(branchAdmin.id, branchAdmin);

  let categoryId = data.categoryId;

  if (data.categoryName) {
    const createdCategory = await prisma.serviceCategory.upsert({
      where: {
        branchId_name: {
          branchId: branchAdmin.id,
          name: data.categoryName.trim(),
        },
      },
      create: {
        branchId: branchAdmin.id,
        name: data.categoryName.trim(),
      },
      update: {},
    });

    categoryId = createdCategory.id;
  }

  if (categoryId) {
    const existingCategory = await prisma.serviceCategory.findFirst({
      where: {
        id: categoryId,
        branchId: branchAdmin.id,
      },
    });

    if (!existingCategory) {
      throw new ServiceCategoryNotFoundError();
    }
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
    include: {
      category: true,
    },
  });

  return mapServiceResponse(service);
}

export async function getMyServices(branchAdminUserId, query) {
  const parsedQuery = query;

  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  const services = await prisma.service.findMany({
    where: {
      branchId: branchAdmin.id,
      ...(parsedQuery.status ? { status: parsedQuery.status } : {}),
    },
    include: {
      category: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return services.map(mapServiceResponse);
}

export async function updateService(data, branchAdminUserId) {

  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  const service = await prisma.service.findFirst({
    where: {
      id: data.id,
      branchId: branchAdmin.id,
    },
  });

  if (!service) {
    throw new AppError(tr.SERVICE_NOT_FOUND, 404);
  }

  if (service.status !== ServiceApprovalStatus.PENDING_APPROVAL) {
    throw new BranchAdminValidationError(
      tr.SERVICE_CANNOT_EDIT_AFTER_APPROVAL,
    );
  }

  let categoryId = service.serviceCategoryId;

  if (data.categoryName) {
    const createdCategory = await prisma.serviceCategory.upsert({
      where: {
        branchId_name: {
          branchId: branchAdmin.id,
          name: data.categoryName.trim(),
        },
      },
      create: {
        branchId: branchAdmin.id,
        name: data.categoryName.trim(),
      },
      update: {},
    });

    categoryId = createdCategory.id;
  } else if (data.categoryId) {
    const existingCategory = await prisma.serviceCategory.findFirst({
      where: {
        id: data.categoryId,
        branchId: branchAdmin.id,
      },
    });

    if (!existingCategory) {
      throw new ServiceCategoryNotFoundError();
    }

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
    include: {
      category: true,
    },
  });

  return mapServiceResponse(updatedService);
}

export async function updateBranchAdminProfile(data, branchAdminUserId) {

  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    include: {
      user: {
        select: {
          id: true,
          password: true,
        },
      },
    },
  });

  if (!branchAdmin || !branchAdmin.user) {
    throw new BranchNotFoundError();
  }
  const branchAdminUser = branchAdmin.user;

  if (data.phone && data.phone !== branchAdmin.phone) {
    const duplicateUser = await prisma.user.findFirst({
      where: {
        phone: data.phone,
        NOT: { id: branchAdminUser.id },
      },
      select: { id: true },
    });

    if (duplicateUser) {
      throw new BranchAdminValidationError(tr.DUPLICATE_PHONE);
    }
  }

  let newPasswordHash;
  if (data.currentPassword && data.newPassword) {
    const isCurrentPasswordValid = await bcrypt.compare(
      data.currentPassword,
      branchAdminUser.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BranchAdminValidationError(tr.CURRENT_PASSWORD_INCORRECT);
    }

    newPasswordHash = await bcrypt.hash(data.newPassword, SALT_ROUNDS);
  }

  const updatedBranchAdmin = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: branchAdminUser.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(newPasswordHash ? { password: newPasswordHash } : {}),
      },
    });

    return tx.branchAdmin.update({
      where: { id: branchAdmin.id },
      data: {
        ...(data.name !== undefined ? { ownerName: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
        ...(data.operatingHours !== undefined
          ? { operatingHours: data.operatingHours }
          : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(newPasswordHash ? { passwordHash: newPasswordHash } : {}),
      },
      select: {
        id: true,
        ownerName: true,
        email: true,
        phone: true,
        businessName: true,
        category: true,
        logoUrl: true,
        operatingHours: true,
        address: true,
        city: true,
        district: true,
        status: true,
        updatedAt: true,
      },
    });
  });

  return updatedBranchAdmin;
}

export async function getBranchAdminProfile(branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: /** @type {any} */ (buildBranchProfileSelect()),
  });

  if (!branchAdmin) throw new BranchNotFoundError();

  return {
    user: mapBranchAdminProfile(branchAdmin),
  };
}

export async function deleteService(id, branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  const service = await prisma.service.findFirst({
    where: {
      id,
      branchId: branchAdmin.id,
    },
  });

  if (!service) {
    throw new BranchNotFoundError();
  }

  const [hasAppointmentLinks, hasReviewLinks, hasStaffLinks] = await Promise.all([
    prisma.appointment.findFirst({
      where: { serviceId: service.id },
      select: { id: true },
    }),
    prisma.review.findFirst({
      where: { serviceId: service.id },
      select: { id: true },
    }),
    prisma.staffService.findFirst({
      where: { serviceId: service.id },
      select: { staffId: true },
    }),
  ]);

  if (hasAppointmentLinks || hasReviewLinks || hasStaffLinks) {
    throw new ServiceDependencyError();
  }

  if (service.status !== ServiceApprovalStatus.PENDING_APPROVAL) {
    throw new BranchAdminValidationError(
      tr.SERVICE_CANNOT_DELETE_AFTER_APPROVAL,
    );
  }

  await prisma.service.delete({
    where: { id: service.id },
  });

  return { message: tr.SERVICE_DELETED };
}

export async function activateSubscription(branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: {
      id: true,
      status: true,
      planId: true,
      isSubscriptionActive: true,
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
    },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  if (branchAdmin.status !== BranchStatus.APPROVED) {
    throw new SubscriptionActivationForbiddenError();
  }

  if (branchAdmin.isSubscriptionActive) {
    throw new SubscriptionAlreadyActiveError();
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.subscriptionPayment.create({
      data: {
        branchId: branchAdmin.id,
        planId: branchAdmin.planId,
        amount: branchAdmin.plan.price,
        status: PaymentStatus.PAID,
        paymentMethod: PaymentMethod.CARD,
        paidAt: now,
      },
      select: {
        id: true,
        amount: true,
        status: true,
        paymentMethod: true,
        paidAt: true,
      },
    });

    const updatedBranch = await tx.branchAdmin.update({
      where: { id: branchAdmin.id },
      data: {
        isSubscriptionActive: true,
        subscriptionStartedAt: now,
      },
      select: {
        id: true,
        isSubscriptionActive: true,
        subscriptionStartedAt: true,
      },
    });

    return { payment, updatedBranch };
  });

  return {
    message: tr.BRANCH_SUBSCRIPTION_ACTIVATED,
    payment: result.payment,
    plan: branchAdmin.plan,
    isSubscriptionActive: result.updatedBranch.isSubscriptionActive,
    subscriptionStartedAt: result.updatedBranch.subscriptionStartedAt,
  };
}

export async function renewSubscription(branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: {
      id: true,
      status: true,
      isSubscriptionActive: true,
      planId: true,
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
    },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  if (branchAdmin.status !== BranchStatus.APPROVED) {
    throw new SubscriptionActivationForbiddenError();
  }



  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.subscriptionPayment.create({
      data: {
        branchId: branchAdmin.id,
        planId: branchAdmin.planId,
        amount: branchAdmin.plan.price,
        status: PaymentStatus.PAID,
        paymentMethod: PaymentMethod.CARD,
        paidAt: now,
      },
      select: {
        id: true,
        amount: true,
        status: true,
        paymentMethod: true,
        paidAt: true,
      },
    });

    const updatedBranch = await tx.branchAdmin.update({
      where: { id: branchAdmin.id },
      data: {
        isSubscriptionActive: true,
        subscriptionStartedAt: now,
      },
      select: {
        id: true,
        isSubscriptionActive: true,
        subscriptionStartedAt: true,
      },
    });

    return { payment, updatedBranch };
  });

  return {
    message: tr.SUBSCRIPTION_RENEWED,
    payment: result.payment,
    plan: branchAdmin.plan,
    isSubscriptionActive: result.updatedBranch.isSubscriptionActive,
    subscriptionStartedAt: result.updatedBranch.subscriptionStartedAt,

  };
}

export async function changeSubscriptionPlan(branchAdminUserId, newPlanId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: {
      id: true,
      status: true,
      isSubscriptionActive: true,
      planId: true,
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
    },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  if (branchAdmin.status !== BranchStatus.APPROVED) {
    throw new SubscriptionActivationForbiddenError();
  }

  const newPlan = await prisma.plan.findUnique({
    where: { id: newPlanId },
    select: {
      id: true,
      name: true,
      price: true,
      maxStaff: true,
      maxServices: true,
      loyaltyEnabled: true,
      offersEnabled: true,
    },
  });

  if (!newPlan) {
    throw new PlanNotFoundError();
  }

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.subscriptionPayment.create({
      data: {
        branchId: branchAdmin.id,
        planId: newPlan.id,
        amount: newPlan.price,
        status: PaymentStatus.PAID,
        paymentMethod: PaymentMethod.CARD,
        paidAt: now,
      },
      select: {
        id: true,
        amount: true,
        status: true,
        paymentMethod: true,
        paidAt: true,
      },
    });

    const updatedBranch = await tx.branchAdmin.update({
      where: { id: branchAdmin.id },
      data: {
        planId: newPlan.id,
        isSubscriptionActive: true,
        subscriptionStartedAt: now,
      },
      select: {
        id: true,
        isSubscriptionActive: true,
        subscriptionStartedAt: true,
      },
    });

    return { payment, updatedBranch };
  });

  return {
    message: tr.SUBSCRIPTION_PLAN_CHANGED,
    payment: result.payment,
    plan: newPlan,
    isSubscriptionActive: result.updatedBranch.isSubscriptionActive,
    subscriptionStartedAt: result.updatedBranch.subscriptionStartedAt,
  };
}


export async function cancelSubscription(branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: {
      id: true,
      status: true,
      isSubscriptionActive: true,
      subscriptionStartedAt: true,
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
    },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  if (branchAdmin.status !== BranchStatus.APPROVED) {
    throw new SubscriptionActivationForbiddenError();
  }

  if (!branchAdmin.isSubscriptionActive) {
    throw new SubscriptionCancellationError();
  }

  // Find the last paid subscription payment
  const payment = await prisma.subscriptionPayment.findFirst({
    where: {
      branchId: branchAdmin.id,
      status: PaymentStatus.PAID
    },
    orderBy: { paidAt: 'desc' }
  });

  let refundAmount = 0;
  if (payment && branchAdmin.subscriptionStartedAt) {
    // 1 week = 7 * 24 * 60 * 60 * 1000 = 604800000 ms
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const timeSinceStart = now.getTime() - branchAdmin.subscriptionStartedAt.getTime();
    
    if (timeSinceStart <= ONE_WEEK_MS) {
      refundAmount = payment.amount; // 100%
    } else {
      refundAmount = payment.amount * 0.7; // 70%
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    if (payment) {
      // Mark as refunded to trigger the activity log in super admin
      await tx.subscriptionPayment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.REFUNDED } 
      });
    }

    const updatedBranch = await tx.branchAdmin.update({
      where: { id: branchAdmin.id },
      data: {
        isSubscriptionActive: false,
        subscriptionStartedAt: null,
      },
      select: {
        id: true,
        isSubscriptionActive: true,
        subscriptionStartedAt: true,
      },
    });

    return updatedBranch;
  });

  return {
    message: tr.SUBSCRIPTION_CANCELED,
    plan: branchAdmin.plan,
    isSubscriptionActive: result.isSubscriptionActive,
    subscriptionStartedAt: result.subscriptionStartedAt,
    refundAmount,
  };
}

export async function getBranchDashboardStats(branchAdminUserId, period = "this_month") {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: { id: true },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  await ensureActiveSubscription(branchAdmin.id);

  const dateWhere = toRangeWhere(period, "scheduledAt");
  const paymentDateWhere = toRangeWhere(period, "paidAt");

  const [
    totalBookings,
    completedBookings,
    canceledBookings,
    paidPayments,
    clientsGroup,
    totalStaff,
    totalServices,
  ] = await Promise.all([
    prisma.appointment.count({
      where: {
        branchId: branchAdmin.id,
        ...dateWhere,
      },
    }),
    prisma.appointment.count({
      where: {
        branchId: branchAdmin.id,
        status: AppointmentStatus.COMPLETED,
        ...dateWhere,
      },
    }),
    prisma.appointment.count({
      where: {
        branchId: branchAdmin.id,
        status: AppointmentStatus.CANCELED,
        ...dateWhere,
      },
    }),
    prisma.bookingPayment.findMany({
      where: {
        branchId: branchAdmin.id,
        status: PaymentStatus.PAID,
        ...paymentDateWhere,
      },
      select: {
        amount: true,
      },
    }),
    prisma.appointment.groupBy({
      by: ["clientId"],
      where: {
        branchId: branchAdmin.id,
        ...dateWhere,
      },
    }),
    prisma.staff.count({
      where: {
        branchId: branchAdmin.id,
        isActive: true,
      },
    }),
    prisma.service.count({
      where: {
        branchId: branchAdmin.id,
        status: ServiceApprovalStatus.APPROVED,
      },
    }),
  ]);

  const totalRevenue = paidPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );

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
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: { id: true },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  await ensureActiveSubscription(branchAdmin.id);

  const dateWhere = toRangeWhere(period, "scheduledAt");

  const completedAppointments = await prisma.appointment.findMany({
    where: {
      branchId: branchAdmin.id,
      status: AppointmentStatus.COMPLETED,
      ...dateWhere,
    },
    select: {
      staffId: true,
      service: {
        select: {
          price: true,
        },
      },
      staff: {
        select: {
          id: true,
          commissionPercentage: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const staffStats = new Map();

  for (const appointment of completedAppointments) {
    const staffId = appointment.staffId;
    const current = staffStats.get(staffId) ?? {
      staffId,
      staffName: appointment.staff?.user?.name ?? "Unknown",
      totalCompletedAppointments: 0,
      totalEarnings: 0,
    };

    const commission = appointment.staff?.commissionPercentage ?? 0;
    const appointmentEarning = (appointment.service?.price ?? 0) * (commission / 100);

    current.totalCompletedAppointments += 1;
    current.totalEarnings += appointmentEarning;

    staffStats.set(staffId, current);
  }

  return [...staffStats.values()].map((entry) => ({
    ...entry,
    totalEarnings: Number(entry.totalEarnings.toFixed(2)),
  }));
}

export async function getBranchPublicProfile(branchId, authUser) {
  const branch = /** @type {any} */ (await prisma.branchAdmin.findUnique({
    where: { id: Number(branchId) },
    select: /** @type {any} */ (buildPublicBranchProfileSelect()),
  }));

  if (!branch) throw new BranchNotFoundError();

  // If requester is branch_admin, ensure it's their branch
  if (authUser && authUser.role === Role.branch_admin) {
    const myBranch = await prisma.branchAdmin.findUnique({ where: { userId: authUser.sub }, select: { id: true } });
    if (!myBranch || myBranch.id !== branch.id) throw new AppError(tr.FORBIDDEN, 403);
  } else if (!(authUser && authUser.role === Role.super_admin)) {
    // For clients and unauthenticated requesters, enforce branch visibility
    if (branch.status !== BranchStatus.APPROVED || !branch.isSubscriptionActive) {
      throw new BranchNotFoundError();
    }
  }

  const reviews = /** @type {any} */ (await prisma.review.findMany({
    where: { branchId: branch.id, isVisible: true },
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      comment: true,
      appointmentId: true,
      createdAt: true,
      client: { select: { user: { select: { name: true, phone: true } } } },
      service: { select: { id: true, name: true } },
      staff: { select: { id: true, user: { select: { id: true, name: true } } } },
    },
  }));

  const formatted = reviews.map(r => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    appointmentId: r.appointmentId,
    createdAt: r.createdAt ? r.createdAt.toISOString() : null,
    reviewer: r.client ? { name: r.client.user.name, phone: r.client.user.phone } : null,
    service: r.service ? { id: r.service.id, name: r.service.name } : null,
    staff: r.staff ? { id: r.staff.id, name: r.staff.user.name } : null,
  }));

  return mapBranchPublicProfile(branch, reviews);
}

export async function updateBranchAvailability(body, branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  if (branchAdmin.status !== BranchStatus.APPROVED) {
    throw new BranchAdminValidationError(tr.BRANCH_IS_UNDER_REVIEW);
  }

  const availability = await prisma.branchAvailability.upsert({
    where: {
      branchAdminId_dayOfWeek: {
        branchAdminId: branchAdmin.id,
        dayOfWeek: body.dayOfWeek,
      },
    },
    create: {
      branchAdminId: branchAdmin.id,
      dayOfWeek: body.dayOfWeek,
      startTime: body.startTime,
      endTime: body.endTime,
      status: body.status ?? AvailabilityStatus.AVAILABLE,
    },
    update: {
      ...(body.startTime !== undefined ? { startTime: body.startTime } : {}),
      ...(body.endTime !== undefined ? { endTime: body.endTime } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    },
    select: {
      id: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return availability;
}

export async function updateBookingSettings(body, branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: { id: true, status: true },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  if (branchAdmin.status !== BranchStatus.APPROVED) {
    throw new BranchAdminValidationError(tr.BRANCH_IS_UNDER_REVIEW);
  }

  const updated = await prisma.branchAdmin.update({
    where: { id: branchAdmin.id },
    data: {
      ...(body.allowCancellationBeforeHours !== undefined
        ? { allowCancellationBeforeHours: body.allowCancellationBeforeHours }
        : {}),
    },
    select: {
      id: true,
      allowCancellationBeforeHours: true,
    },
  });

  return updated;
}

export async function updateNotificationSettings(body, branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: { id: true, status: true },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  if (branchAdmin.status !== BranchStatus.APPROVED) {
    throw new BranchAdminValidationError(tr.BRANCH_IS_UNDER_REVIEW);
  }

  const updated = await prisma.branchAdmin.update({
    where: { id: branchAdmin.id },
    data: {
      ...(body.bookingNotificationsEnabled !== undefined
        ? { bookingNotificationsEnabled: body.bookingNotificationsEnabled }
        : {}),
      ...(body.marketingNotificationsEnabled !== undefined
        ? { marketingNotificationsEnabled: body.marketingNotificationsEnabled }
        : {}),
    },
    select: {
      id: true,
      bookingNotificationsEnabled: true,
      marketingNotificationsEnabled: true,
    },
  });

  return updated;
}

export async function listAppointments(branchAdminUserId, query = {}) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: { id: true },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  const where = /** @type {any} */ ({
    branchId: branchAdmin.id,
    ...(query.status ? { status: query.status } : {}),
    ...(query.staffId ? { staffId: query.staffId } : {}),
  });

  if (query.date) {
    const targetDate = dayjs(query.date).toDate();
    where.scheduledAt = {
      gte: dayjs(targetDate).startOf("day").toDate(),
      lte: dayjs(targetDate).endOf("day").toDate(),
    };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { scheduledAt: "desc" },
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      client: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      },
      staff: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          price: true,
          durationMinutes: true,
        },
      },
      bookingPayment: {
        select: {
          status: true,
          paymentMethod: true,
          paidAt: true,
          amount: true,
        },
      },
    },
  });

  return appointments.map((appointment) => ({
    id: appointment.id,
    scheduledAt: appointment.scheduledAt,
    status: appointment.status,
    client: appointment.client?.user ?? null,
    staff: appointment.staff?.user ?? null,
    service: appointment.service,
    paymentStatus: appointment.bookingPayment?.status ?? PaymentStatus.PENDING,
  }));
}

export async function getAppointmentDetails(branchAdminUserId, appointmentId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: { id: true },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      branchId: true,
      scheduledAt: true,
      status: true,
      client: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      },
      staff: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          durationMinutes: true,
        },
      },
      bookingPayment: {
        select: {
          status: true,
          paymentMethod: true,
          paidAt: true,
          amount: true,
        },
      },
      serviceExcutions: {
        select: {
          notes: true,
          attachments: true,
        },
      },
    },
  });

  if (!appointment) {
    throw new AppointmentNotFoundError();
  }

  if (appointment.branchId !== branchAdmin.id) {
    throw new AppointmentAccessError();
  }

  return {
    id: appointment.id,
    scheduledAt: appointment.scheduledAt,
    status: appointment.status,
    client: appointment.client?.user ?? null,
    staff: appointment.staff?.user ?? null,
    service: appointment.service,
    paymentStatus: appointment.bookingPayment?.status ?? PaymentStatus.PENDING,
    paymentMethod: appointment.bookingPayment?.paymentMethod ?? null,
    paidAt: appointment.bookingPayment?.paidAt ?? null,
    amount: appointment.bookingPayment?.amount ?? null,
    notes: appointment.serviceExcutions?.[0]?.notes ?? null,
    attachments: appointment.serviceExcutions?.[0]?.attachments ?? null,
  };
}

export async function cancelAppointment(branchAdminUserId, appointmentId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: { id: true },
  });

  if (!branchAdmin) {
    throw new BranchNotFoundError();
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      branchId: true,
      status: true,
    },
  });

  if (!appointment) {
    throw new AppointmentNotFoundError();
  }

  if (appointment.branchId !== branchAdmin.id) {
    throw new AppointmentAccessError();
  }

  if (
    appointment.status === AppointmentStatus.COMPLETED ||
    appointment.status === AppointmentStatus.CANCELED
  ) {
    throw new AppointmentCancellationError();
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.CANCELED,
    },
    select: {
      id: true,
      status: true,
      updatedAt: true,
    },
  });

  return updated;
}

export async function getRevenueChartData(branchAdminUserId, period = "this_month") {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: { id: true },
  });
  if (!branchAdmin) throw new BranchNotFoundError();
  await ensureActiveSubscription(branchAdmin.id);

  const dateWhere = toRangeWhere(period, "paidAt");
  const payments = await prisma.bookingPayment.findMany({
    where: {
      branchId: branchAdmin.id,
      status: PaymentStatus.PAID,
      ...dateWhere,
    },
    select: {
      amount: true,
      paidAt: true,
    },
    orderBy: { paidAt: "asc" },
  });

  const chartData = {};
  payments.forEach((payment) => {
    if (!payment.paidAt) return;
    let key;
    if (period === "today") {
      key = dayjs(payment.paidAt).format("HH:00");
    } else if (period === "this_year") {
      key = dayjs(payment.paidAt).format("YYYY-MM");
    } else {
      key = dayjs(payment.paidAt).format("YYYY-MM-DD");
    }
    chartData[key] = (chartData[key] || 0) + payment.amount;
  });

  return Object.entries(chartData).map(([label, value]) => ({
    label,
    revenue: Number(value.toFixed(2)),
  }));
}

export async function getRecentBookings(branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: { id: true },
  });
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
      client: {
        select: {
          user: {
            select: { name: true, phone: true },
          },
        },
      },
      staff: {
        select: {
          user: {
            select: { name: true },
          },
        },
      },
      service: {
        select: {
          name: true,
          price: true,
          durationMinutes: true,
        },
      },
      bookingPayment: {
        select: {
          status: true,
        },
      },
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
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: { id: true },
  });
  if (!branchAdmin) throw new BranchNotFoundError();
  await ensureActiveSubscription(branchAdmin.id);

  const dateWhere = toRangeWhere(period, "scheduledAt");

  const appointments = await prisma.appointment.findMany({
    where: {
      branchId: branchAdmin.id,
      status: AppointmentStatus.COMPLETED,
      ...dateWhere,
    },
    select: {
      service: {
        select: {
          id: true,
          name: true,
          price: true,
          imageUrl: true,
        },
      },
      bookingPayment: {
        select: {
          status: true,
          amount: true,
        },
      },
    },
  });

  const serviceStats = {};
  appointments.forEach((apt) => {
    if (!apt.service) return;
    const sId = apt.service.id;
    if (!serviceStats[sId]) {
      serviceStats[sId] = {
        id: sId,
        name: apt.service.name,
        price: apt.service.price,
        imageUrl: apt.service.imageUrl,
        bookingCount: 0,
        revenue: 0,
      };
    }
    serviceStats[sId].bookingCount += 1;
    if (apt.bookingPayment?.status === PaymentStatus.PAID) {
      serviceStats[sId].revenue += apt.bookingPayment.amount;
    }
  });

  return Object.values(serviceStats)
    .sort((a, b) => b.revenue - a.revenue || b.bookingCount - a.bookingCount)
    .slice(0, 5)
    .map((s) => ({
      ...s,
      revenue: Number(s.revenue.toFixed(2)),
    }));
}

export async function getRecentTransactions(branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: { id: true },
  });
  if (!branchAdmin) throw new BranchNotFoundError();
  await ensureActiveSubscription(branchAdmin.id);

  const payments = await prisma.bookingPayment.findMany({
    where: {
      branchId: branchAdmin.id,
      status: { in: [PaymentStatus.PAID, PaymentStatus.REFUNDED] },
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: {
      id: true,
      amount: true,
      status: true,
      paidAt: true,
      paymentMethod: true,
      appointment: {
        select: {
          client: {
            select: {
              user: {
                select: { name: true },
              },
            },
          },
          service: {
            select: { name: true },
          },
        },
      },
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

export async function getBranchFinanceStats(branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: { id: true },
  });
  if (!branchAdmin) throw new BranchNotFoundError();
  await ensureActiveSubscription(branchAdmin.id);

  const startOfMonth = dayjs().startOf("month").toDate();
  const endOfMonth = dayjs().endOf("month").toDate();

  const [monthlyPayments, totalPayments, activeServices, completedBookings] = await Promise.all([
    prisma.bookingPayment.findMany({
      where: {
        branchId: branchAdmin.id,
        status: PaymentStatus.PAID,
        paidAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: { amount: true },
    }),
    prisma.bookingPayment.count({
      where: {
        branchId: branchAdmin.id,
        status: PaymentStatus.PAID,
      },
    }),
    prisma.service.count({
      where: {
        branchId: branchAdmin.id,
        status: ServiceApprovalStatus.APPROVED,
      },
    }),
    prisma.appointment.count({
      where: {
        branchId: branchAdmin.id,
        status: AppointmentStatus.COMPLETED,
      },
    }),
  ]);

  const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

  return {
    monthlyRevenue: Number(monthlyRevenue.toFixed(2)),
    totalPayments,
    activeServices,
    completedBookings,
  };
}

export async function listFinancePayments(branchAdminUserId, query = {}) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: { id: true },
  });
  if (!branchAdmin) throw new BranchNotFoundError();
  await ensureActiveSubscription(branchAdmin.id);

  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  /** @type {any} */
  const where = {
    branchId: branchAdmin.id,
    ...(query.status ? { status: query.status } : {}),
  };


  if (query.date) {
    const start = dayjs(query.date).startOf("day").toDate();
    const end = dayjs(query.date).endOf("day").toDate();
    where.paidAt = { gte: start, lte: end };
  } else if (query.startDate || query.endDate) {
    where.paidAt = {};
    if (query.startDate) where.paidAt.gte = dayjs(query.startDate).toDate();
    if (query.endDate) where.paidAt.lte = dayjs(query.endDate).toDate();
  }

  const [payments, total] = await Promise.all([
    prisma.bookingPayment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        amount: true,
        status: true,
        paymentMethod: true,
        paidAt: true,
        appointment: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            client: {
              select: {
                user: {
                  select: { name: true, phone: true },
                },
              },
            },
            service: {
              select: { name: true },
            },
          },
        },
      },
    }),
    prisma.bookingPayment.count({ where }),
  ]);

  return {
    payments: payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      paymentMethod: p.paymentMethod,
      paidAt: p.paidAt,
      appointmentId: p.appointment?.id ?? null,
      clientName: p.appointment?.client?.user?.name ?? null,
      serviceName: p.appointment?.service?.name ?? null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export class PaymentNotPaidError extends AppError {
  constructor() {
    super(tr.INVALID_APPOINTMENT_STATUS, 400);
    this.name = "PaymentNotPaidError";
  }
}

export class PaymentAlreadyRefundedError extends AppError {
  constructor() {
    super(tr.INVALID_APPOINTMENT_STATUS, 400);
    this.name = "PaymentAlreadyRefundedError";
  }
}

export async function processBookingPaymentRefund(branchAdminUserId, paymentId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: { id: true },
  });
  if (!branchAdmin) throw new BranchNotFoundError();
  await ensureActiveSubscription(branchAdmin.id);

  const payment = await prisma.bookingPayment.findUnique({
    where: { id: paymentId },
    select: { id: true, branchId: true, status: true },
  });

  if (!payment) {
    throw new BookingPaymentNotFoundError();
  }

  if (payment.branchId !== branchAdmin.id) {
    throw new BookingPaymentAccessError();
  }

  if (payment.status === PaymentStatus.REFUNDED) {
    throw new PaymentAlreadyRefundedError();
  }

  if (payment.status !== PaymentStatus.PAID) {
    throw new PaymentNotPaidError();
  }

  const updatedPayment = await prisma.bookingPayment.update({
    where: { id: paymentId },
    data: { status: PaymentStatus.REFUNDED },
    select: {
      id: true,
      amount: true,
      status: true,
      paidAt: true,
      updatedAt: true,
    },
  });

  return updatedPayment;
}

export async function exportFinanceReport(branchAdminUserId, query = {}) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: { id: true },
  });
  if (!branchAdmin) throw new BranchNotFoundError();
  await ensureActiveSubscription(branchAdmin.id);

  /** @type {any} */
  let dateWhere = {};
  if (query.period) {
    dateWhere = toRangeWhere(query.period, "paidAt");
  } else if (query.startDate || query.endDate) {
    dateWhere.paidAt = {};
    if (query.startDate) dateWhere.paidAt.gte = dayjs(query.startDate).toDate();
    if (query.endDate) dateWhere.paidAt.lte = dayjs(query.endDate).toDate();
  }


  const payments = await prisma.bookingPayment.findMany({
    where: {
      branchId: branchAdmin.id,
      ...dateWhere,
    },
    orderBy: { paidAt: "asc" },
    select: {
      id: true,
      amount: true,
      status: true,
      paymentMethod: true,
      paidAt: true,
      appointment: {
        select: {
          scheduledAt: true,
          client: {
            select: {
              user: {
                select: { name: true, phone: true },
              },
            },
          },
          service: {
            select: { name: true },
          },
        },
      },
    },
  });

  let csv = "Payment ID,Amount,Status,Payment Method,Paid At,Client Name,Client Phone,Service,Appointment Time\n";
  payments.forEach((p) => {
    const paidAtStr = p.paidAt ? p.paidAt.toISOString() : "";
    const scheduledStr = p.appointment?.scheduledAt ? p.appointment.scheduledAt.toISOString() : "";
    const clientName = p.appointment?.client?.user?.name ?? "";
    const clientPhone = p.appointment?.client?.user?.phone ?? "";
    const serviceName = p.appointment?.service?.name ?? "";
    csv += `"${p.id}","${p.amount}","${p.status}","${p.paymentMethod}","${paidAtStr}","${clientName.replace(/"/g, '""')}","${clientPhone}","${serviceName.replace(/"/g, '""')}","${scheduledStr}"\n`;
  });

  return csv;
}
