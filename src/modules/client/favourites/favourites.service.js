import { BranchStatus } from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import { getClientByUserId } from "../helpers.js";
import {
  BranchNotFoundError,
  FavouriteAlreadyExistsError,
  FavouriteNotFoundError,
  StaffNotFoundError,
} from "../errors.js";

export async function addFavoriteBranch(branchId, authUser) {
  const client = await getClientByUserId(authUser.sub);

  const branch = await prisma.branchAdmin.findUnique({
    where: { id: branchId },
    select: { id: true, status: true },
  });

  if (!branch || branch.status !== BranchStatus.APPROVED) {
    throw new BranchNotFoundError();
  }

  const existing = await prisma.favoriteBranch.findUnique({
    where: {
      clientId_branchId: {
        clientId: client.id,
        branchId,
      },
    },
  });

  if (existing) {
    throw new FavouriteAlreadyExistsError();
  }

  const fav = await prisma.favoriteBranch.create({
    data: {
      clientId: client.id,
      branchId,
    },
  });

  return fav;
}

export async function removeFavoriteBranch(branchId, authUser) {
  const client = await getClientByUserId(authUser.sub);

  const fav = await prisma.favoriteBranch.findUnique({
    where: {
      clientId_branchId: {
        clientId: client.id,
        branchId,
      },
    },
  });

  if (!fav) {
    throw new FavouriteNotFoundError();
  }

  await prisma.favoriteBranch.delete({
    where: {
      clientId_branchId: {
        clientId: client.id,
        branchId,
      },
    },
  });

  return { branchId };
}

export async function addFavoriteStaff(staffId, authUser) {
  const client = await getClientByUserId(authUser.sub);

  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true, isActive: true },
  });

  if (!staff || !staff.isActive) {
    throw new StaffNotFoundError();
  }

  const existing = await prisma.favoriteStaff.findUnique({
    where: {
      clientId_staffId: {
        clientId: client.id,
        staffId,
      },
    },
  });

  if (existing) {
    throw new FavouriteAlreadyExistsError();
  }

  const fav = await prisma.favoriteStaff.create({
    data: {
      clientId: client.id,
      staffId,
    },
  });

  return fav;
}

export async function removeFavoriteStaff(staffId, authUser) {
  const client = await getClientByUserId(authUser.sub);

  const fav = await prisma.favoriteStaff.findUnique({
    where: {
      clientId_staffId: {
        clientId: client.id,
        staffId,
      },
    },
  });

  if (!fav) {
    throw new FavouriteNotFoundError();
  }

  await prisma.favoriteStaff.delete({
    where: {
      clientId_staffId: {
        clientId: client.id,
        staffId,
      },
    },
  });

  return { staffId };
}

export async function getClientFavourites(query, authUser) {
  const client = await getClientByUserId(authUser.sub);
  const type = query.type; // "branch_admin" or "staff" or undefined

  let branches = [];
  let staffList = [];

  if (!type || type === "branch_admin") {
    const favBranches = await prisma.favoriteBranch.findMany({
      where: { clientId: client.id },
      include: {
        branch: {
          select: {
            id: true,
            businessName: true,
            category: true,
            logoUrl: true,
            city: true,
            district: true,
            averageRating: true,
            reviewCount: true,
          },
        },
      },
    });
    branches = favBranches.map((fav) => ({
      id: fav.branch.id,
      name: fav.branch.businessName,
      category: fav.branch.category,
      logoUrl: fav.branch.logoUrl,
      city: fav.branch.city,
      district: fav.branch.district,
      rating: fav.branch.averageRating,
      totalReviews: fav.branch.reviewCount,
    }));
  }

  if (!type || type === "staff") {
    const favStaff = await prisma.favoriteStaff.findMany({
      where: { clientId: client.id },
      include: {
        staff: {
          include: {
            user: { select: { name: true } },
            professionalProfile: { select: { specialization: true } },
          },
        },
      },
    });
    staffList = favStaff.map((fav) => ({
      id: fav.staff.id,
      name: fav.staff.user.name,
      profileImageUrl: fav.staff.profileImageUrl,
      role: fav.staff.staffRole,
      averageRating: fav.staff.averageRating,
      reviewCount: fav.staff.reviewCount,
      specialization: fav.staff.professionalProfile?.specialization || null,
    }));
  }

  return {
    branches,
    staff: staffList,
  };
}
