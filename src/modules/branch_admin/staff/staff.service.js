import bcrypt from "bcrypt";
import {
    AvailabilityStatus,
    BranchStatus,
    Role,
    ServiceApprovalStatus,
    UserStatus,
} from "../../../generated/prisma/client.js";
import { tr } from "../../../lib/i18n/index.js";
import prisma from "../../../lib/prisma.js";
import { ensureStaffLimitNotExceeded } from "../../../utils/subscriptionGuards.js";
import { DEFAULT_BRANCH_CLOSE_TIME, DEFAULT_BRANCH_OPEN_TIME, SALT_ROUNDS } from "../constants.js";
import {
    BranchAdminValidationError,
    BranchNotFoundError,
    StaffNotFoundError,
} from "../errors.js";
import { buildStaffUserSelect } from "../helpers.js";

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

  if (!branchAdmin) throw new BranchNotFoundError();
  if (branchAdmin.status !== BranchStatus.APPROVED) throw new BranchAdminValidationError(tr.BRANCH_IS_UNDER_REVIEW);

  await ensureStaffLimitNotExceeded(branchAdmin.id, branchAdmin);

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { phone: data.phone }] },
    select: { email: true, phone: true },
  });

  if (existingUser) {
    if (existingUser.email === data.email) throw new BranchAdminValidationError(tr.DUPLICATE_EMAIL);
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
        staff: buildStaffUserSelect().staff,
      },
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && /** @type {any} */ (error).code === "P2002") {
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

  if (!branchAdmin) throw new BranchNotFoundError();

  return prisma.user.findMany({
    where: {
      role: Role.staff,
      staff: {
        is: {
          branchId: branchAdmin.id,
          isActive: true,
        },
      },
    },
    select: buildStaffUserSelect(),
    orderBy: { createdAt: "desc" },
  });
}

export async function getMyStaffById(staffId, branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
  });

  if (!branchAdmin) throw new BranchNotFoundError();

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
    select: buildStaffUserSelect(),
  });

  if (!staff) throw new StaffNotFoundError();
  return staff;
}

export async function updateStaff(data, branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
  });

  if (!branchAdmin) throw new BranchNotFoundError();

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
      staff: { select: { id: true } },
    },
  });

  if (!staff || !staff.staff) throw new StaffNotFoundError();

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
      if (duplicateUser.email === data.email) throw new BranchAdminValidationError(tr.DUPLICATE_EMAIL);
      if (duplicateUser.phone === data.phone) throw new BranchAdminValidationError(tr.DUPLICATE_PHONE);
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
  if (data.startDate !== undefined) staffUpdateData.startDate = new Date(data.startDate);
  if (data.staffRole !== undefined) staffUpdateData.staffRole = data.staffRole;
  if (data.profileImageUrl !== undefined) staffUpdateData.profileImageUrl = data.profileImageUrl;
  if (data.commissionPercentage !== undefined) staffUpdateData.commissionPercentage = data.commissionPercentage;

  await prisma.$transaction(async (tx) => {
    if (Object.keys(userUpdateData).length > 0) {
      await tx.user.update({ where: { id: staff.id }, data: userUpdateData });
    }

    if (Object.keys(staffUpdateData).length > 0) {
      await tx.staff.update({ where: { userId: staff.id }, data: staffUpdateData });
    }

    if (data.serviceIds) {
      await tx.staffService.deleteMany({ where: { staffId } });
      await tx.staffService.createMany({
        data: uniqueServiceIds.map((serviceId) => ({ staffId, serviceId })),
      });
    }
  });

  return getMyStaffById(staff.id, branchAdminUserId);
}

export async function deleteStaff(id, branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
  });

  if (!branchAdmin) throw new BranchNotFoundError();

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

  if (!staff) throw new StaffNotFoundError();

  await prisma.$transaction(async (tx) => {
    await tx.staff.update({ where: { userId: staff.id }, data: { isActive: false } });
    await tx.user.update({ where: { id: staff.id }, data: { status: UserStatus.INACTIVE } });
  });

  return { message: tr.STAFF_DELETED };
}