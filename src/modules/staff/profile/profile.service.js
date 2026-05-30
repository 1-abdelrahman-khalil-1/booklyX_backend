import { AvailabilityStatus } from "../../../generated/prisma/client.js";
import { mapStaffProfile } from "../../../lib/mappers/profile.mapper.js";
import prisma from "../../../lib/prisma.js";
import { StaffNotFoundError } from "../errors.js";

export async function getStaffProfile(userId) {
  const staff = await prisma.staff.findUnique({
    where: { userId },
    select: {
      id: true,
      profileImageUrl: true,
      age: true,
      staffRole: true,
      commissionPercentage: true,
      isActive: true,
      averageRating: true,
      reviewCount: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      branch: {
        select: {
          id: true,
          businessName: true,
          category: true,
        },
      },
      professionalProfile: {
        select: {
          id: true,
          bio: true,
          yearsOfExperience: true,
          licenseNumber: true,
          specialization: true,
          createdAt: true,
          updatedAt: true,
        },
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
        },
      },
      availabilities: {
        where: {
          status: AvailabilityStatus.AVAILABLE,
        },
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
        },
      },
      services: {
        select: {
          service: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              durationMinutes: true,
              imageUrl: true,
            },
          },
        },
      },
      reviews: {
        where: {
          isVisible: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          rating: true,
          comment: true,
          appointmentId: true,
          createdAt: true,
          client: {
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
            },
          },
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!staff) {
    throw new StaffNotFoundError();
  }

  return mapStaffProfile(staff);
}
