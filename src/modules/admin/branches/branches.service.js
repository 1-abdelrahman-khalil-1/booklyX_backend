import { BranchStatus } from "../../../generated/prisma/client.js";
import { tr } from "../../../lib/i18n/index.js";
import prisma from "../../../lib/prisma.js";
import { AppError } from "../../../utils/AppError.js";

export class BranchNotFound extends AppError {
  constructor() {
    super(tr.BRANCH_NOT_FOUND, 404);
    this.name = "BranchNotFound";
  }
}

export class BranchIsNotPendingError extends AppError {
  constructor() {
    super(tr.BRANCH_IS_NOT_PENDING_APPROVAL, 409);
    this.name = "BranchIsNotPendingError";
  }
}

export async function listBranches(status) {
  return prisma.branchAdmin.findMany({
    where: status ? { status } : { status: BranchStatus.PENDING_APPROVAL },
    select: {
      id: true,
      businessName: true,
      ownerName: true,
      category: true,
      city: true,
      logoUrl: true,
      status: true,
      rejectionReason: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBranchDetails(id) {
  const branch = await prisma.branchAdmin.findUnique({
    where: { id },
    select: {
      id: true,
      ownerName: true,
      email: true,
      phone: true,
      businessName: true,
      category: true,
      description: true,
      commercialRegisterNumber: true,
      taxId: true,
      logoUrl: true,
      taxCertificateUrl: true,
      commercialRegisterUrl: true,
      nationalIdUrl: true,
      facilityLicenseUrl: true,
      city: true,
      district: true,
      address: true,
      operatingHours: true,
      latitude: true,
      longitude: true,
      status: true,
      isSubscriptionActive: true,
      subscriptionStartedAt: true,
      rejectionReason: true,
      createdAt: true,
      updatedAt: true,
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
      documents: {
        select: {
          id: true,
          type: true,
          fileUrl: true,
          createdAt: true,
        },
      },
    },
  });

  if (!branch) throw new BranchNotFound();
  return branch;
}

export async function approveBranch(id) {
  const branch = await prisma.branchAdmin.findUnique({ where: { id } });
  if (!branch) throw new BranchNotFound();
  if (branch.status !== BranchStatus.PENDING_APPROVAL) throw new BranchIsNotPendingError();

  await prisma.branchAdmin.update({ where: { id: branch.id }, data: { status: BranchStatus.APPROVED, rejectionReason: null } });
  return { message: tr.BRANCH_APPROVED };
}

export async function rejectBranch(id, reason) {
  const branch = await prisma.branchAdmin.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!branch) throw new BranchNotFound();
  if (branch.status !== BranchStatus.PENDING_APPROVAL) throw new BranchIsNotPendingError();

  await prisma.branchAdmin.update({ where: { id: branch.id }, data: { status: BranchStatus.REJECTED, rejectionReason: reason } });
  return { message: tr.BRANCH_REJECTED };
}
