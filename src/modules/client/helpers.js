import prisma from "../../lib/prisma.js";
import { ClientNotFoundError } from "./errors.js";

// Helper to ensure client model exists for current user
export async function getClientByUserId(userId) {
  const client = await prisma.client.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!client) {
    throw new ClientNotFoundError();
  }
  return client;
}

export function buildClientProfilePayload(req) {
  const payload = { ...req.body };
  if (req.files && req.files.profile_image && req.files.profile_image.length > 0) {
    // Cloudinary stores the URL in the 'path' property
    payload.profileImageUrl = req.files.profile_image[0].path;
  }
  return payload;
}
