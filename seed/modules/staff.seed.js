import pLimit from "p-limit";
import { prisma } from "../helpers/prisma.js";
import { hashPassword } from "../helpers/bcrypt.js";
import { daysAgo, monthsAgo, monthsFromNow } from "../helpers/dates.js";
import { pickRandom } from "../helpers/random.js";
import { ASSETS } from "../config/assets.js";
import {
  AvailabilityStatus,
  Role,
  ServiceApprovalStatus,
  UserStatus,
} from "../../src/generated/prisma/client.js";
import { getSeedStaff } from "../generators/staff.generator.js";

function buildStaffAvailability(staffSeeds) {
  return staffSeeds.flatMap((staff, index) => [
    {
      email: staff.email,
      dayOfWeek: ((index + 1 - 1) % 7) + 1,
      startTime: "09:00",
      endTime: "17:00",
      status: AvailabilityStatus.AVAILABLE,
    },
    {
      email: staff.email,
      dayOfWeek: ((index + 4 - 1) % 7) + 1,
      startTime: "13:00",
      endTime: "15:00",
      status: AvailabilityStatus.UNAVAILABLE,
    },
  ]);
}

function buildStaffCertificates(staffSeeds) {
  return staffSeeds.flatMap((staff, index) => [
    {
      staffEmail: staff.email,
      title: `${staff.name} Professional Certification`,
      issuer: "BooklyX Academy",
      issueDateOffsetMonths: 30 + index,
      expiryDateOffsetMonths: index % 2 === 0 ? 18 : null,
      verified: true,
    },
    {
      staffEmail: staff.email,
      title: `${staff.name} Compliance Badge`,
      issuer: "BooklyX QA Board",
      issueDateOffsetMonths: 12 + index,
      expiryDateOffsetMonths: null,
      verified: index % 2 === 0,
    },
  ]);
}

export async function seedStaff(branchSubmissions, staffSeeds = null) {
  const resolvedStaffSeeds = staffSeeds ?? getSeedStaff(branchSubmissions);

  for (const staffData of resolvedStaffSeeds) {
    const staffPasswordHash = await hashPassword(staffData.password);

    const staffUser = await prisma.user.upsert({
      where: { email: staffData.email },
      update: {
        name: staffData.name,
        password: staffPasswordHash,
        phone: staffData.phone,
        role: Role.staff,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
      },
      create: {
        name: staffData.name,
        email: staffData.email,
        password: staffPasswordHash,
        phone: staffData.phone,
        role: Role.staff,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
      },
    });

    const branch = await prisma.branchAdmin.findFirst({
      where: { email: staffData.branchEmail },
    });

    if (!branch) {
      throw new Error(
        `Staff seed failed: branch ${staffData.branchEmail} was not found.`,
      );
    }

    const existingStaff = await prisma.staff.findUnique({
      where: { userId: staffUser.id },
    });

    if (existingStaff) {
      await prisma.staff.update({
        where: { userId: staffUser.id },
        data: {
          branchId: branch.id,
          age: staffData.age,
          startDate: daysAgo(staffData.startDateOffsetDays),
          profileImageUrl: staffData.profileImageUrl,
          staffRole: staffData.staffRole,
          commissionPercentage: staffData.commissionPercentage,
        },
      });
    } else {
      await prisma.staff.create({
        data: {
          userId: staffUser.id,
          branchId: branch.id,
          age: staffData.age,
          startDate: daysAgo(staffData.startDateOffsetDays),
          profileImageUrl: staffData.profileImageUrl,
          staffRole: staffData.staffRole,
          commissionPercentage: staffData.commissionPercentage,
        },
      });
    }

    const staffRecord = await prisma.staff.findUnique({
      where: { userId: staffUser.id },
      select: { id: true },
    });

    const approvedServices = await prisma.service.findMany({
      where: {
        branchId: branch.id,
        status: ServiceApprovalStatus.APPROVED,
      },
      select: { id: true },
      orderBy: { id: "asc" },
    });

    if (staffRecord) {
      await prisma.staffService.deleteMany({
        where: { staffId: staffRecord.id },
      });

      if (approvedServices.length > 0) {
        await prisma.staffService.createMany({
          data: approvedServices.map((service) => ({
            staffId: staffRecord.id,
            serviceId: service.id,
          })),
        });
      }

      await prisma.staffProfessionalProfile.upsert({
        where: { staffId: staffRecord.id },
        update: {
          bio: `${staffData.name} - Professional ${staffData.staffRole}`,
          yearsOfExperience: 5,
          specialization: staffData.staffRole,
        },
        create: {
          staffId: staffRecord.id,
          bio: `${staffData.name} - Professional ${staffData.staffRole}`,
          yearsOfExperience: 5,
          specialization: staffData.staffRole,
        },
      });
    }
  }

  const availabilitySeeds = buildStaffAvailability(resolvedStaffSeeds);
  const availabilityLimit = pLimit(8);

  await Promise.all(
    availabilitySeeds.map((availability) =>
      availabilityLimit(async () => {
        const staff = await prisma.staff.findFirst({
          where: { user: { email: availability.email } },
        });

        if (!staff) {
          return;
        }

        await prisma.staffAvailability.upsert({
          where: {
            staffId_dayOfWeek: {
              staffId: staff.id,
              dayOfWeek: availability.dayOfWeek,
            },
          },
          update: {
            startTime: availability.startTime,
            endTime: availability.endTime,
            status: availability.status,
          },
          create: {
            staffId: staff.id,
            dayOfWeek: availability.dayOfWeek,
            startTime: availability.startTime,
            endTime: availability.endTime,
            status: availability.status,
          },
        });
      }),
    ),
  );

  const certificateSeeds = buildStaffCertificates(resolvedStaffSeeds);
  const certificateLimit = pLimit(6);

  await Promise.all(
    certificateSeeds.map((cert) =>
      certificateLimit(async () => {
        const staff = await prisma.staff.findFirst({
          where: { user: { email: cert.staffEmail } },
        });

        if (!staff) {
          return;
        }

        await prisma.staffCertificate.deleteMany({
          where: { staffId: staff.id, title: cert.title },
        });

        await prisma.staffCertificate.create({
          data: {
            staffId: staff.id,
            title: cert.title,
            issuer: cert.issuer,
            issueDate: monthsAgo(cert.issueDateOffsetMonths),
            expiryDate: cert.expiryDateOffsetMonths
              ? monthsFromNow(cert.expiryDateOffsetMonths)
              : null,
            fileUrl: pickRandom(ASSETS.certificates, staff.id),
            verified: cert.verified,
          },
        });
      }),
    ),
  );

  return { staffSeeds: resolvedStaffSeeds };
}
