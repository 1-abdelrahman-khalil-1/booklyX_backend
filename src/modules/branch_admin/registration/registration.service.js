import bcrypt from "bcrypt";
import {
    BranchStatus,
    Prisma,
    VerificationType,
} from "../../../generated/prisma/client.js";
import {
    sendEmailVerification,
    sendPhoneVerificationCode,
} from "../../../lib/email.js";
import { tr } from "../../../lib/i18n/index.js";
import prisma from "../../../lib/prisma.js";
import { SALT_ROUNDS } from "../constants.js";
import {
    BranchAdminValidationError,
    BranchNotFoundError,
    BranchNotPendingApprovalError,
    DuplicateBranchAdminUserError,
    InactivePlanError,
    InvalidPlanError
} from "../errors.js";
import { consumeBranchOtp, createBranchOtp, findLatestBranchByEmail } from "../helpers.js";

export async function submitBranch(data) {
  const plan = await prisma.plan.findUnique({
    where: { id: data.planId },
    select: { id: true, isActive: true },
  });

  if (!plan) throw new InvalidPlanError();
  if (!plan.isActive) throw new InactivePlanError();

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  let branchSubmission;
  try {
    branchSubmission = await prisma.$transaction(async (tx) => {
      const [existingUser, existingBranchSubmissions] = await Promise.all([
        tx.user.findFirst({
          where: { OR: [{ email: data.email }, { phone: data.phone }] },
          select: { id: true },
        }),
        tx.branchAdmin.findMany({
          where: { OR: [{ email: data.email }, { phone: data.phone }] },
          select: { id: true, status: true },
        }),
      ]);

      if (existingUser) throw new DuplicateBranchAdminUserError();

      if (existingBranchSubmissions.length > 0) {
        const hasActiveBranchSubmission = existingBranchSubmissions.some(
          (existingBranchSubmission) => existingBranchSubmission.status !== BranchStatus.REJECTED,
        );

        if (hasActiveBranchSubmission) throw new DuplicateBranchAdminUserError();

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

  const code = await createBranchOtp(branchSubmission.id, VerificationType.EMAIL);
  await sendEmailVerification(branchSubmission.email, code);
  const { passwordHash: _passwordHash, ...rest } = branchSubmission;
  return { message: tr.BRANCH_SUBMITTED, branch: rest };
}

export async function verifyBranchEmail(email, code) {
  const branchSubmission = await findLatestBranchByEmail(email);
  if (!branchSubmission) throw new BranchNotFoundError();

  if (branchSubmission.emailVerified) return { message: tr.EMAIL_ALREADY_VERIFIED };

  if (branchSubmission.status !== BranchStatus.PENDING_VERIFICATION) {
    throw new BranchNotPendingApprovalError();
  }

  await consumeBranchOtp(branchSubmission.id, VerificationType.EMAIL, code);

  const updatedRows = await prisma.branchAdmin.updateMany({
    where: {
      id: branchSubmission.id,
      status: BranchStatus.PENDING_VERIFICATION,
      emailVerified: false,
    },
    data: { emailVerified: true },
  });

  if (updatedRows.count === 0) throw new BranchNotPendingApprovalError();

  const phoneCode = await createBranchOtp(branchSubmission.id, VerificationType.PHONE);
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

  await consumeBranchOtp(branchSubmission.id, VerificationType.PHONE, code);

  const updatedRows = await prisma.branchAdmin.updateMany({
    where: {
      id: branchSubmission.id,
      status: BranchStatus.PENDING_VERIFICATION,
      emailVerified: true,
      phoneVerified: false,
    },
    data: { phoneVerified: true, status: BranchStatus.PENDING_APPROVAL },
  });

  if (updatedRows.count === 0) throw new BranchNotPendingApprovalError();

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