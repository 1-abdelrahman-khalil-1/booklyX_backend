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
