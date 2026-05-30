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

  await prisma.bookingPayment.deleteMany({
    where: { appointmentId: { in: appointmentIds } },
  });

  await prisma.serviceExecution.deleteMany({
    where: { appointmentId: { in: appointmentIds } },
  });

  await prisma.appointment.deleteMany({
    where: { id: { in: appointmentIds } },
  });
}

/**
 * Find the first currently valid offer for a service (if any).
 * Mirrors the eligibility rules in getValidOffersForService.
 */
async function findActiveOfferForService(serviceId) {
  const now = new Date();
  const link = await prisma.offerService.findFirst({
    where: {
      serviceId,
      offer: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    },
    select: {
      offer: {
        select: {
          id: true,
          discountType: true,
          discountValue: true,
          usageLimit: true,
          usedCount: true,
        },
      },
    },
  });
  if (!link) return null;
  const { offer } = link;
  // Respect usage limit
  if (offer.usageLimit !== null && offer.usedCount >= offer.usageLimit) return null;
  return offer;
}

function resolveDiscount(price, offer) {
  if (!offer) return { discount: 0, finalAmount: price };
  const discount = offer.discountType === "PERCENTAGE"
    ? Math.min(price, price * (offer.discountValue / 100))
    : Math.min(price, offer.discountValue);
  return {
    discount: Number(discount.toFixed(2)),
    finalAmount: Number((price - discount).toFixed(2)),
  };
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

    // Seed corresponding BookingPayment record for every appointment
    const staffService = staffServiceMap.get(seed.staffId);
    const basePrice = staffService ? Math.round(staffService.service.price) : 150;

    // Apply an offer to paid appointments so the demo data reflects the new pricing fields
    const isPaid =
      seed.status === AppointmentStatus.COMPLETED ||
      seed.status === AppointmentStatus.CONFIRMED ||
      seed.status === AppointmentStatus.IN_PROGRESS ||
      seed.status === AppointmentStatus.CANCELED;

    let appliedOfferId = null;
    let discountAmount = 0;
    let finalAmount = basePrice;

    if (isPaid && staffService) {
      const offer = await findActiveOfferForService(seed.serviceId);
      if (offer) {
        const resolved = resolveDiscount(basePrice, offer);
        discountAmount = resolved.discount;
        finalAmount = resolved.finalAmount;
        appliedOfferId = offer.id;

        // Keep usedCount consistent with the number of seeded paid appointments
        await prisma.offer.update({
          where: { id: offer.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    let paymentStatus = "PENDING";
    let paidAt = null;

    if (
      seed.status === AppointmentStatus.COMPLETED ||
      seed.status === AppointmentStatus.CONFIRMED ||
      seed.status === AppointmentStatus.IN_PROGRESS
    ) {
      paymentStatus = "PAID";
      paidAt = seed.scheduledAt;
    } else if (seed.status === AppointmentStatus.CANCELED) {
      paymentStatus = "REFUNDED";
      paidAt = seed.scheduledAt;
    }

    await prisma.bookingPayment.create({
      data: {
        branchId: seed.branchId,
        appointmentId: appointment.id,
        amount: finalAmount,
        originalAmount: basePrice,
        discountAmount,
        appliedOfferId,
        status: paymentStatus,
        paidAt,
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
