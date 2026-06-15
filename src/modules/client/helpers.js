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
/**
 * @returns {import('../../generated/prisma/index.js').Prisma.StaffSelect}
 */
export function buildStaffUserSelect() {
  return {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    },
    id: true,
    staffRole: true,
    age: true,
    commissionPercentage: true,
    isActive: true,
    profileImageUrl: true,
    createdAt: true,
    updatedAt: true,
    branch: {
      select: {
        id: true,
        businessName: true,
        category: true,
      }
    },
    certificates: {
      select: {
        id: true,
        title: true,
        issuer: true,
        issueDate: true,
        expiryDate: true,
        fileUrl: true,
        verified: true,
        createdAt: true,
      }
    },
    availabilities: {
      select: {
        id: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        status: true,
      }
    },
    services: {
      include: {
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            durationMinutes: true,
            status: true,
            imageUrl: true,
          },
        },
      },
    },
    professionalProfile: true,
    averageRating: true,
    reviewCount: true,
    reviews: {
      select: {
        client: {
          include: {
            user: { select: { id: true, name: true, phone: true } },
          },
        },
        service: { select: { id: true, name: true } },
        staff: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    },
    favoritedByClients: true,
  }
}
