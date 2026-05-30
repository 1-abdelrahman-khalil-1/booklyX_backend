import bcrypt from "bcrypt";
import {
    AvailabilityStatus,
    BranchStatus,
    Role,
} from "../../../generated/prisma/client.js";
import { tr } from "../../../lib/i18n/index.js";
import prisma from "../../../lib/prisma.js";
import { AppError } from "../../../utils/AppError.js";
import {
    BranchAdminValidationError,
    BranchNotFoundError,
} from "../errors.js";
import { buildBranchProfileSelect, buildPublicBranchProfileSelect } from "../helpers.js";

export async function updateBranchAdminProfile(data, branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    include: { user: { select: { id: true, password: true } } },
  });

  if (!branchAdmin || !branchAdmin.user) throw new BranchNotFoundError();
  const branchAdminUser = branchAdmin.user;

  if (data.phone && data.phone !== branchAdmin.phone) {
    const duplicateUser = await prisma.user.findFirst({
      where: { phone: data.phone, NOT: { id: branchAdminUser.id } },
      select: { id: true },
    });
    if (duplicateUser) throw new BranchAdminValidationError(tr.DUPLICATE_PHONE);
  }

  let newPasswordHash;
  if (data.currentPassword && data.newPassword) {
    const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, branchAdminUser.password);
    if (!isCurrentPasswordValid) throw new BranchAdminValidationError(tr.CURRENT_PASSWORD_INCORRECT);
    newPasswordHash = await bcrypt.hash(data.newPassword, 10);
  }

  return prisma.$transaction(async (tx) => {
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
        ...(data.operatingHours !== undefined ? { operatingHours: data.operatingHours } : {}),
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
}

export async function getBranchAdminProfile(branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: /** @type {any} */ (buildBranchProfileSelect()),
  });

  if (!branchAdmin) throw new BranchNotFoundError();

  return { user: await import("../../../lib/mappers/profile.mapper.js").then((m) => m.mapBranchAdminProfile(branchAdmin)) };
}

export async function getBranchPublicProfile(branchId, authUser) {
  const branch = /** @type {any} */ (await prisma.branchAdmin.findUnique({
    where: { id: Number(branchId) },
    select: /** @type {any} */ (buildPublicBranchProfileSelect()),
  }));

  if (!branch) throw new BranchNotFoundError();

  if (authUser && authUser.role === Role.branch_admin) {
    const myBranch = await prisma.branchAdmin.findUnique({ where: { userId: authUser.sub }, select: { id: true } });
    if (!myBranch || myBranch.id !== branch.id) throw new AppError(tr.FORBIDDEN, 403);
  } else if (!(authUser && authUser.role === Role.super_admin)) {
    if (branch.status !== BranchStatus.APPROVED || !branch.isSubscriptionActive) throw new BranchNotFoundError();
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

  return await import("../../../lib/mappers/profile.mapper.js").then((m) => m.mapBranchPublicProfile(branch, reviews));
}

export async function updateBranchAvailability(body, branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { userId: branchAdminUserId }, select: { id: true, status: true } });
  if (!branchAdmin) throw new BranchNotFoundError();
  if (branchAdmin.status !== BranchStatus.APPROVED) throw new BranchAdminValidationError(tr.BRANCH_IS_UNDER_REVIEW);

  return prisma.branchAvailability.upsert({
    where: { branchAdminId_dayOfWeek: { branchAdminId: branchAdmin.id, dayOfWeek: body.dayOfWeek } },
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
    select: { id: true, dayOfWeek: true, startTime: true, endTime: true, status: true, createdAt: true, updatedAt: true },
  });
}

export async function updateBookingSettings(body, branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { userId: branchAdminUserId }, select: { id: true, status: true } });
  if (!branchAdmin) throw new BranchNotFoundError();
  if (branchAdmin.status !== BranchStatus.APPROVED) throw new BranchAdminValidationError(tr.BRANCH_IS_UNDER_REVIEW);

  return prisma.branchAdmin.update({
    where: { id: branchAdmin.id },
    data: {
      ...(body.allowCancellationBeforeHours !== undefined ? { allowCancellationBeforeHours: body.allowCancellationBeforeHours } : {}),
    },
    select: { id: true, allowCancellationBeforeHours: true },
  });
}

export async function updateNotificationSettings(body, branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { userId: branchAdminUserId }, select: { id: true, status: true } });
  if (!branchAdmin) throw new BranchNotFoundError();
  if (branchAdmin.status !== BranchStatus.APPROVED) throw new BranchAdminValidationError(tr.BRANCH_IS_UNDER_REVIEW);

  return prisma.branchAdmin.update({
    where: { id: branchAdmin.id },
    data: {
      ...(body.bookingNotificationsEnabled !== undefined ? { bookingNotificationsEnabled: body.bookingNotificationsEnabled } : {}),
      ...(body.marketingNotificationsEnabled !== undefined ? { marketingNotificationsEnabled: body.marketingNotificationsEnabled } : {}),
    },
    select: { id: true, bookingNotificationsEnabled: true, marketingNotificationsEnabled: true },
  });
}