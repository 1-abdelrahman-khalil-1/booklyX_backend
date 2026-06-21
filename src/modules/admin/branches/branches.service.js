import { BranchStatus, UserStatus } from "../../../generated/prisma/client.js";
import { tr } from "../../../lib/i18n/index.js";
import prisma from "../../../lib/prisma.js";
import { BranchIsNotPendingError, BranchNotFound, BranchCannotBeBlockedUnapprovedError } from "../errors.js";

export async function listBranches(status) {
  let where = {};
  if (status === "SUSPENDED") {
    where = {
      status: BranchStatus.APPROVED,
      isSubscriptionActive: false,
    };
  } else if (status) {
    where = { status };
  } else {
    where = { status: BranchStatus.PENDING_APPROVAL };
  }

  const branches = await prisma.branchAdmin.findMany({
    where,
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
  const categoryCounts = {};
  branches.forEach((branch) => {
    if (!categoryCounts[branch.category]) categoryCounts[branch.category] = 0;
    categoryCounts[branch.category]++;
  });
  return { branches, categoryCounts };
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
      branchAvailabilities: true,
      

    },
  });

  if (!branch) throw new BranchNotFound();

  const bookingsCount = await prisma.appointment.count({
    where: { branchId: branch.id },
  });

  return {
    ...branch,
    bookingsCount,
  };
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

export async function toggleBlockBranch(id) {
  const branch = await prisma.branchAdmin.findUnique({
    where: { id },
    select: { id: true, status: true, isSubscriptionActive: true, userId: true },
  });

  if (!branch) throw new BranchNotFound();
  if (branch.status !== BranchStatus.APPROVED) {
    throw new BranchCannotBeBlockedUnapprovedError();
  }

  const willBlock = branch.isSubscriptionActive;

  await prisma.$transaction(async (tx) => {
    await tx.branchAdmin.update({
      where: { id: branch.id },
      data: { isSubscriptionActive: !willBlock },
    });

    if (branch.userId) {
      await tx.user.update({
        where: { id: branch.userId },
        data: { status: willBlock ? UserStatus.SUSPENDED : UserStatus.ACTIVE },
      });
    }
  });

  return {
    message: willBlock ? tr.BRANCH_BLOCKED : tr.BRANCH_UNBLOCKED,
  };
}
