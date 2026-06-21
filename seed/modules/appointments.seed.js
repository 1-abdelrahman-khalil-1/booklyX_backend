import { prisma } from "../helpers/prisma.js";
import { buildAppointmentSeeds } from "../generators/appointments.generator.js";
import { AppointmentStatus, Role } from "../../src/generated/prisma/client.js";

async function resetSeededAppointmentsAndReviews(seedClientEmails) {
  await prisma.review.deleteMany({});
  await prisma.bookingPayment.deleteMany({});
  await prisma.serviceExecution.deleteMany({});
  await prisma.appointment.deleteMany({});
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

  const staffServicesMap = new Map();
  for (const staff of staffMembers) {
    const staffServices = await prisma.staffService.findMany({
      where: { staffId: staff.id },
      include: { service: true },
      orderBy: { serviceId: "asc" },
    });

    if (staffServices.length > 0) {
      staffServicesMap.set(staff.id, staffServices);
    }
  }

  const appointmentSeeds = buildAppointmentSeeds(clients, staffMembers, (staff) => {
    const staffServices = staffServicesMap.get(staff.id);
    if (!staffServices || staffServices.length === 0) return null;

    return staffServices.map(link => ({
      serviceId: link.serviceId,
      branchId: link.service.branchId,
    }));
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
    const staffServices = staffServicesMap.get(seed.staffId);
    const staffService = staffServices ? staffServices.find(s => s.serviceId === seed.serviceId) : null;
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
