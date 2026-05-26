import { prisma } from "../helpers/prisma.js";
import { buildAppointmentSeeds } from "../generators/appointments.generator.js";
import { AppointmentStatus, Role } from "../../src/generated/prisma/client.js";

async function resetSeededAppointmentsAndReviews(seedClientEmails) {
  const seededClients = await prisma.client.findMany({
    where: { user: { email: { in: seedClientEmails } } },
    select: { id: true },
  });

  const clientIds = seededClients.map((client) => client.id);
  if (clientIds.length === 0) {
    return;
  }

  const appointments = await prisma.appointment.findMany({
    where: { clientId: { in: clientIds } },
    select: { id: true },
  });
  const appointmentIds = appointments.map((appointment) => appointment.id);

  await prisma.review.deleteMany({
    where: {
      OR: [
        { clientId: { in: clientIds } },
        { appointmentId: { in: appointmentIds } },
      ],
    },
  });

  await prisma.serviceExecution.deleteMany({
    where: { appointmentId: { in: appointmentIds } },
  });

  await prisma.appointment.deleteMany({
    where: { id: { in: appointmentIds } },
  });
}

export async function seedAppointments(seedClientEmails, seedStaffEmails) {
  await resetSeededAppointmentsAndReviews(seedClientEmails);

  const clients = await prisma.client.findMany({
    where: { user: { email: { in: seedClientEmails } } },
    include: { user: true },
    orderBy: { id: "asc" },
  });

  const staffMembers = await prisma.staff.findMany({
    where: { user: { email: { in: seedStaffEmails } } },
    include: { user: true },
    orderBy: { id: "asc" },
  });

  if (clients.length === 0 || staffMembers.length === 0) {
    return { reviewTargets: [] };
  }

  const staffServiceMap = new Map();
  for (const staff of staffMembers) {
    const staffService = await prisma.staffService.findFirst({
      where: { staffId: staff.id },
      include: { service: true },
      orderBy: { serviceId: "asc" },
    });

    if (staffService) {
      staffServiceMap.set(staff.id, staffService);
    }
  }

  const appointmentSeeds = buildAppointmentSeeds(clients, staffMembers, (staff) => {
    const staffService = staffServiceMap.get(staff.id);
    if (!staffService) return null;

    return {
      serviceId: staffService.serviceId,
      branchId: staffService.service.branchId,
    };
  });

  const reviewTargets = [];

  for (const seed of appointmentSeeds) {
    const appointment = await prisma.appointment.create({
      data: {
        clientId: seed.clientId,
        staffId: seed.staffId,
        serviceId: seed.serviceId,
        branchId: seed.branchId,
        scheduledAt: seed.scheduledAt,
        status: seed.status,
      },
    });

    if (seed.status === AppointmentStatus.COMPLETED) {
      const client = clients.find((item) => item.id === seed.clientId);
      const staff = staffMembers.find((item) => item.id === seed.staffId);

      if (client && staff) {
        reviewTargets.push({
          clientId: client.id,
          reviewerId: client.userId,
          serviceId: seed.serviceId,
          branchId: seed.branchId,
          staffId: seed.staffId,
          appointmentId: appointment.id,
          reviewerRole: Role.client,
          scheduledAt: seed.scheduledAt,
          clientEmail: client.user.email,
        });
      }
    }
  }

  return { reviewTargets };
}
