import { AvailabilityStatus } from "../../../generated/prisma/client.js";
import { mapStaffProfile } from "../../../lib/mappers/profile.mapper.js";
import prisma from "../../../lib/prisma.js";
import { StaffNotFoundError } from "../errors.js";

export async function getStaffProfile(userId) {
  const staff = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      staff: {
        select: {
          id: true,
          profileImageUrl: true,
          staffRole: true,
          age: true,
          commissionPercentage: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
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
            select: {
              id: true,
              dayOfWeek: true,
              startTime: true,
              endTime: true,
              status: true,
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
                  status: true,
                },
              },
            },
          },
          reviews: {
            select: {
              id: true,
              rating: true,
              comment: true,
              createdAt: true,
              appointmentId: true,
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
          averageRating: true,
          reviewCount: true,
        },
      },
    },
  });

  if (!staff) {
    throw new StaffNotFoundError();
  }

  return { user: mapStaffProfile(staff) };
}
