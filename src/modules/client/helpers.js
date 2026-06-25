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
        id: true,
        rating: true,
        comment: true,
        appointmentId: true,
        createdAt: true,
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
export function buildClientAppointmentPreviewSelect() {
  return {
    id: true,
    scheduledAt: true,
    status: true,
    service: {
      select: {
        id: true,
        name: true,
        imageUrl: true,
        price: true,
      },
    },
    staff: {
      select: {
        id: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    },
    branch: {
      select: {
        id: true,
        businessName: true,
        logoUrl: true,
      },
    },
    bookingPayment: {
      select: {
        status: true,
        amount: true,
      },
    },
  };
}

export function buildClientAppointmentDetailsSelect(clientId) {
  return {
    id: true,
    scheduledAt: true,
    status: true,
    service: {
      select: {
        id: true,
        name: true,
        price: true,
        durationMinutes: true,
        imageUrl: true,
        description: true,
      },
    },
    staff: {
      select: {
        id: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    },
    branch: {
      select: {
        id: true,
        businessName: true,
        logoUrl: true,
        address: true,
        phone: true,
      },
    },
    bookingPayment: {
      select: {
        status: true,
        paymentMethod: true,
        paidAt: true,
        amount: true,
        originalAmount: true,
        discountAmount: true,
        appliedOfferId: true,
      },
    },
    review: {
      where: { clientId },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
      }
    },
    createdAt: true,
    updatedAt: true,
  };
}
