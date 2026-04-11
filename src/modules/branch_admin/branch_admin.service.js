import bcrypt from "bcrypt";
import {
  ApplicationStatus,
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
import prisma from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import {
  addServiceCategorySchema,
  applySchema,
  createServiceSchema,
  createStaffSchema,
  deleteServiceSchema,
  myServicesQuerySchema,
  resendCodeSchema,
  updateServiceSchema,
  validateBranchAdminInput,
  verifyEmailSchema,
  verifyPhoneSchema,
} from "./branch_admin.validation.js";

const SALT_ROUNDS = 10;
const FIXED_OTP_CODE = process.env.FIXED_OTP_CODE || "333333";
const CODE_EXPIRES_MINUTES = parseInt(
  process.env.VERIFICATION_CODE_EXPIRES_MINUTES || "10",
  10,
);
const MAX_ATTEMPTS = 5;

export class BranchAdminValidationError extends AppError {
  constructor(message, params) {
    super(message, 400, params);
    this.name = "BranchAdminValidationError";
  }
}

export class ApplicationNotFound extends AppError {
  constructor() {
    super(tr.APPLICATION_NOT_FOUND, 404);
    this.name = "ApplicationNotFound";
  }
}

export class DuplicateBranchAdminUserError extends AppError {
  constructor() {
    super(tr.DUPLICATE_ACCOUNT, 409);
    this.name = "DuplicateBranchAdminUserError";
  }
}

export class ApplicationNotPendingError extends AppError {
  constructor() {
    super(tr.APPLICATION_IS_UNDER_REVIEW, 400);
    this.name = "ApplicationNotPendingError";
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
    super(tr.CATEGORY_REQUIRED, 404);
    this.name = "ServiceCategoryNotFoundError";
  }
}

async function findLatestApplicationByEmail(email) {
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

async function createApplicationOtp(applicationId, type) {
  await prisma.applicationVerificationCode.deleteMany({
    where: { applicationId, type, used: false },
  });

  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + CODE_EXPIRES_MINUTES);

  await prisma.applicationVerificationCode.create({
    data: { applicationId, type, codeHash, expiresAt },
  });

  return code;
}

async function consumeApplicationOtp(applicationId, type, code) {
  const record = await prisma.applicationVerificationCode.findFirst({
    where: { applicationId, type, used: false },
    orderBy: { createdAt: "desc" },
  });

  if (!record) throw new InvalidOTPError();
  if (record.attempts >= MAX_ATTEMPTS) throw new MaxAttemptsExceededError();
  if (new Date() > record.expiresAt) throw new OTPExpiredError();

  const isValid = await bcrypt.compare(code, record.codeHash);
  if (!isValid) {
    await prisma.applicationVerificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new InvalidOTPError();
  }

  await prisma.applicationVerificationCode.update({
    where: { id: record.id },
    data: { used: true },
  });
}

export async function submitApplication(body) {
  const data = validateBranchAdminInput(applySchema, body);

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  let application;
  try {
    application = await prisma.$transaction(async (tx) => {
      const [existingUser, existingApplications] = await Promise.all([
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

      if (existingApplications.length > 0) {
        const hasActiveApplication = existingApplications.some(
          (existingApplication) =>
            existingApplication.status !== ApplicationStatus.REJECTED,
        );

        if (hasActiveApplication) {
          throw new DuplicateBranchAdminUserError();
        }

        await tx.branchAdmin.deleteMany({
          where: {
            id: { in: existingApplications.map((existingApplication) => existingApplication.id) },
          },
        });
      }

      return tx.branchAdmin.create({
        data: {
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
          status: ApplicationStatus.PENDING_VERIFICATION,
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DuplicateBranchAdminUserError();
    }
    throw error;
  }

  const code = await createApplicationOtp(
    application.id,
    VerificationType.EMAIL,
  );
  await sendEmailVerification(application.email, code);
  const { passwordHash: _passwordHash, ...rest } = application;
  return { message: tr.APPLICATION_SUBMITTED, application: rest };
}

export async function verifyApplicationEmail(email, code) {
  const data = validateBranchAdminInput(verifyEmailSchema, { email, code });

  const application = await findLatestApplicationByEmail(data.email);
  if (!application) throw new ApplicationNotFound();

  if (application.emailVerified) return { message: tr.EMAIL_ALREADY_VERIFIED };

  // Only allow verification when the application is actually pending verification
  if (application.status !== ApplicationStatus.PENDING_VERIFICATION) {
    throw new ApplicationNotPendingError();
  }

  await consumeApplicationOtp(
    application.id,
    VerificationType.EMAIL,
    data.code,
  );

  const updatedRows = await prisma.branchAdmin.updateMany({
    where: {
      id: application.id,
      status: ApplicationStatus.PENDING_VERIFICATION,
      emailVerified: false,
    },
    data: { emailVerified: true },
  });

  if (updatedRows.count === 0) {
    throw new ApplicationNotPendingError();
  }

  const phoneCode = await createApplicationOtp(
    application.id,
    VerificationType.PHONE,
  );
  await sendPhoneVerificationCode(data.email, phoneCode);

  return { message: tr.EMAIL_VERIFIED_SUCCESS };
}

export async function verifyApplicationPhone(email, code) {
  const data = validateBranchAdminInput(verifyPhoneSchema, { email, code });

  const application = await findLatestApplicationByEmail(data.email);
  if (!application) throw new ApplicationNotFound();

  if (application.phoneVerified) return { message: tr.PHONE_ALREADY_VERIFIED };

  if (!application.emailVerified) {
    throw new BranchAdminValidationError(tr.EMAIL_NOT_VERIFIED);
  }

  if (application.status !== ApplicationStatus.PENDING_VERIFICATION) {
    throw new ApplicationNotPendingError();
  }

  await consumeApplicationOtp(
    application.id,
    VerificationType.PHONE,
    data.code,
  );

  const updatedRows = await prisma.branchAdmin.updateMany({
    where: {
      id: application.id,
      status: ApplicationStatus.PENDING_VERIFICATION,
      emailVerified: true,
      phoneVerified: false,
    },
    data: { phoneVerified: true, status: ApplicationStatus.PENDING_APPROVAL },
  });

  if (updatedRows.count === 0) {
    throw new ApplicationNotPendingError();
  }

  return { message: tr.APPLICATION_UNDER_REVIEW };
}

export async function resendApplicationCode(email, type) {
  const data = validateBranchAdminInput(resendCodeSchema, { email, type });

  const application = await findLatestApplicationByEmail(data.email);
  if (!application) throw new ApplicationNotFound();

  if (application.status !== ApplicationStatus.PENDING_VERIFICATION) {
    throw new ApplicationNotPendingError();
  }

  if (data.type === VerificationType.EMAIL && application.emailVerified) {
    throw new BranchAdminValidationError(tr.EMAIL_ALREADY_VERIFIED);
  }

  if (data.type === VerificationType.PHONE && !application.emailVerified) {
    throw new BranchAdminValidationError(tr.EMAIL_NOT_VERIFIED);
  }

  if (data.type === VerificationType.PHONE && application.phoneVerified) {
    throw new BranchAdminValidationError(tr.PHONE_ALREADY_VERIFIED);
  }

  const newCode = await createApplicationOtp(application.id, data.type);

  if (data.type === VerificationType.EMAIL) {
    await sendEmailVerification(application.email, newCode);
  } else {
    await sendPhoneVerificationCode(application.email, newCode);
  }

  return { message: tr.VERIFICATION_CODE_SENT };
}

export async function createStaff(body, branchAdminUserId) {
  const data = validateBranchAdminInput(createStaffSchema, body);

  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
  });

  if (!branchAdmin) {
    throw new ApplicationNotFound();
  }

  if (branchAdmin.status !== ApplicationStatus.APPROVED) {
    throw new BranchAdminValidationError(tr.APPLICATION_IS_UNDER_REVIEW);
  }

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
            age: data.age,
            startDate: new Date(data.startDate),
            staffRole: data.staffRole,
            commissionPercentage: data.commissionPercentage,
            services: {
              create: uniqueServiceIds.map((serviceId) => ({
                service: { connect: { id: serviceId } },
              })),
            },
          },
        },
      },
      include: {
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

export async function addServiceCategory(body, branchAdminUserId) {
  const data = validateBranchAdminInput(addServiceCategorySchema, body);

  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
  });

  if (!branchAdmin) {
    throw new ApplicationNotFound();
  }

  if (branchAdmin.status !== ApplicationStatus.APPROVED) {
    throw new BranchAdminValidationError(tr.APPLICATION_IS_UNDER_REVIEW);
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
    throw new ApplicationNotFound();
  }

  return prisma.serviceCategory.findMany({
    where: { branchId: branchAdmin.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function createService(body, branchAdminUserId) {
  const data = validateBranchAdminInput(createServiceSchema, body);

  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: { id: true, status: true },
  });

  if (!branchAdmin) {
    throw new ApplicationNotFound();
  }

  if (branchAdmin.status !== ApplicationStatus.APPROVED) {
    throw new BranchAdminValidationError(tr.APPLICATION_IS_UNDER_REVIEW);
  }

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
      duration: data.durationMinutes,
      imageUrl: data.imageUrl,
      status: ServiceApprovalStatus.PENDING_APPROVAL,
    },
    include: {
      category: true,
    },
  });

  return service;
}

export async function getMyServices(branchAdminUserId, query) {
  const parsedQuery = validateBranchAdminInput(myServicesQuerySchema, query);

  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
  });

  if (!branchAdmin) {
    throw new ApplicationNotFound();
  }

  return prisma.service.findMany({
    where: {
      branchId: branchAdmin.id,
      ...(parsedQuery.status ? { status: parsedQuery.status } : {}),
    },
    include: {
      category: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateService(body, branchAdminUserId) {
  const data = validateBranchAdminInput(updateServiceSchema, body);

  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
  });

  if (!branchAdmin) {
    throw new ApplicationNotFound();
  }

  const service = await prisma.service.findFirst({
    where: {
      id: data.id,
      branchId: branchAdmin.id,
    },
  });

  if (!service) {
    throw new ApplicationNotFound();
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
      duration:
        data.durationMinutes ??
        service.duration ??
        service.durationMinutes,
      imageUrl: data.imageUrl ?? service.imageUrl,
      serviceCategoryId: categoryId,
    },
    include: {
      category: true,
    },
  });

  return updatedService;
}

export async function deleteService(body, branchAdminUserId) {
  const data = validateBranchAdminInput(deleteServiceSchema, body);

  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
  });

  if (!branchAdmin) {
    throw new ApplicationNotFound();
  }

  const service = await prisma.service.findFirst({
    where: {
      id: data.id,
      branchId: branchAdmin.id,
    },
  });

  if (!service) {
    throw new ApplicationNotFound();
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
