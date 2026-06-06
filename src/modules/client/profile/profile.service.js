import { mapClientProfile } from "../../../lib/mappers/profile.mapper.js";
import prisma from "../../../lib/prisma.js";
import { ClientNotFoundError } from "../errors.js";

export async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      client: true,
    },
  });

  if (!user || user.role !== "client") {
    throw new ClientNotFoundError();
  }

  return mapClientProfile(user);
}

export async function updateProfile(userId, data) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { client: true },
  });

  if (!user || user.role !== "client") {
    throw new ClientNotFoundError();
  }

  const userUpdateData = {};
  if (data.name !== undefined) {
    userUpdateData.name = data.name;
  }

  const clientUpdateData = {};
  if (data.profileImageUrl !== undefined) {
    clientUpdateData.profileImageUrl = data.profileImageUrl;
  }

  const updatedUser = await prisma.$transaction(async (tx) => {
    if (Object.keys(userUpdateData).length > 0) {
      await tx.user.update({
        where: { id: userId },
        data: userUpdateData,
      });
    }

    if (Object.keys(clientUpdateData).length > 0 && user.client) {
      await tx.client.update({
        where: { id: user.client.id },
        data: clientUpdateData,
      });
    }

    return tx.user.findUnique({
      where: { id: userId },
      include: { client: true },
    });
  });

  return mapClientProfile(updatedUser);
}