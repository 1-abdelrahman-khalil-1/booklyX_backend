import {
  AppointmentStatus,
  BranchStatus,
  PaymentStatus,
  ServiceApprovalStatus,
} from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import dayjs from "dayjs";
import { AppError } from "../../../utils/AppError.js";
import { tr } from "../../../lib/i18n/index.js";
import { getClientByUserId, buildClientAppointmentPreviewSelect, buildClientAppointmentDetailsSelect } from "../helpers.js";
import {
  getValidOffersForService,
  resolveDiscountAmount,
  safeIncrementOfferUsedCount,
} from "../offers/offers.service.js";
import {
  OfferAlreadyInUseError,
  OfferNotAvailableError,
  AppointmentCancellationNotAllowedError,
  AppointmentNotFoundError,
  DoubleBookingError,
  PastBookingError,
  ServiceNotBookableError,
  StaffNotFoundError,
} from "../errors.js";

export async function reserveAppointment(data, authUser) {
  const client = await getClientByUserId(authUser.sub);
  const { serviceId, staffId, scheduledAt } = data;

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, price: true, durationMinutes: true, status: true, branchId: true, branch: { select: { status: true, isSubscriptionActive: true } } },
  });

  if (!service || service.status !== ServiceApprovalStatus.APPROVED || service.branch.status !== BranchStatus.APPROVED || !service.branch.isSubscriptionActive) {
    throw new ServiceNotBookableError();
  }

  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true, isActive: true, branchId: true },
  });

  if (!staff || !staff.isActive || staff.branchId !== service.branchId) {
    throw new StaffNotFoundError();
  }

  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000);

  if (start <= new Date()) {
    throw new PastBookingError();
  }

  const dayStart = dayjs(start).startOf("day").toDate();
  const dayEnd = dayjs(start).endOf("day").toDate();

  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      staffId,
      status: {
        in: [AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS],
      },
      scheduledAt: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    select: {
      scheduledAt: true,
      service: {
        select: { durationMinutes: true },
      },
    },
  });

  const hasOverlap = bookedAppointments.some((apt) => {
    const aptStart = apt.scheduledAt;
    const aptEnd = dayjs(aptStart).add(apt.service.durationMinutes, "minute").toDate();
    return !(end <= aptStart || start >= aptEnd);
  });

  if (hasOverlap) {
    throw new DoubleBookingError();
  }

  let discountAmount = 0;
  let appliedOffer = null;

  if (data.appliedOfferId) {
    const claimedOffer = await prisma.claimedOffer.findUnique({
      where: {
        clientId_offerId: {
          clientId: client.id,
          offerId: data.appliedOfferId,
        },
      },
    });

    if (!claimedOffer || claimedOffer.isUsed) {
      throw new OfferNotAvailableError();
    }

    const validOffers = await getValidOffersForService(serviceId);
    const matchedOffer = validOffers.find((o) => o.id === data.appliedOfferId);

    if (!matchedOffer) {
      throw new OfferNotAvailableError();
    }

    // Check if user already has an active booking using this offer
    const alreadyUsing = await prisma.appointment.findFirst({
      where: {
        clientId: client.id,
        status: {
          in: [
            AppointmentStatus.PENDING,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.IN_PROGRESS,
          ],
        },
        bookingPayment: {
          appliedOfferId: data.appliedOfferId,
        },
      },
    });

    if (alreadyUsing) {
      throw new OfferAlreadyInUseError();
    }

    discountAmount = Math.round(resolveDiscountAmount(service.price, matchedOffer));
    appliedOffer = {
      id: matchedOffer.id,
      title: matchedOffer.title,
      discountType: matchedOffer.discountType,
      discountValue: matchedOffer.discountValue,
    };
  }

  const originalAmount = Math.round(service.price);
  const finalAmount = Math.max(0, originalAmount - discountAmount);
  const appliedOfferId = data.appliedOfferId ?? null;

  const result = await prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.create({
      data: {
        clientId: client.id,
        staffId,
        serviceId,
        branchId: service.branchId,
        scheduledAt: start,
        status: AppointmentStatus.PENDING,
      },
      include: {
        service: { select: { name: true, price: true } },
        staff: { include: { user: { select: { name: true } } } },
      },
    });

    const payment = await tx.bookingPayment.create({
      data: {
        branchId: service.branchId,
        appointmentId: appointment.id,
        amount: finalAmount,
        originalAmount,
        discountAmount,
        appliedOfferId,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      appointment,
      payment,
      appliedOffer,
    };
  });

  return result;
}

export async function confirmAppointmentPayment(appointmentId, data, authUser) {
  const client = await getClientByUserId(authUser.sub);

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      bookingPayment: true,
    },
  });

  if (!appointment || appointment.clientId !== client.id) {
    throw new AppointmentNotFoundError();
  }

  if (appointment.status !== AppointmentStatus.PENDING) {
    throw new AppError(tr.INVALID_APPOINTMENT_STATUS, 400);
  }

  const { success } = data;

  const result = await prisma.$transaction(async (tx) => {
    if (success) {
      const updatedAppt = await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.CONFIRMED },
      });

      const updatedPayment = await tx.bookingPayment.update({
        where: { appointmentId },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
        },
      });

      if (appointment.bookingPayment?.appliedOfferId) {
        await safeIncrementOfferUsedCount(appointment.bookingPayment.appliedOfferId, tx);
        await tx.claimedOffer.update({
          where: {
            clientId_offerId: {
              clientId: client.id,
              offerId: appointment.bookingPayment.appliedOfferId,
            },
          },
          data: {
            isUsed: true,
            usedAt: new Date(),
          },
        });
      }

      return {
        appointment: updatedAppt,
        payment: updatedPayment,
        message: tr.PAYMENT_CONFIRMED_SUCCESSFULLY,
      };
    } else {
      const updatedPayment = await tx.bookingPayment.update({
        where: { appointmentId },
        data: { status: PaymentStatus.FAILED },
      });

      return {
        appointment,
        payment: updatedPayment,
        message: tr.INVALID_CREDENTIALS,
      };
    }
  });

  return result;
}

export async function getClientAppointments(authUser, query = {}) {
  const client = await getClientByUserId(authUser.sub);
  const { status } = query;

  const where = { clientId: client.id };

  if (status === "pending") {
    where.status = { notIn: [AppointmentStatus.CANCELED, AppointmentStatus.COMPLETED] };
    where.bookingPayment = { status: PaymentStatus.PENDING };
  } else if (status === "upcoming") {
    where.status = { notIn: [AppointmentStatus.CANCELED, AppointmentStatus.COMPLETED] };
    where.bookingPayment = { status: PaymentStatus.PAID };
    where.scheduledAt = { gt: new Date() };
  } else if (status === "closed") {
    where.status = { in: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELED] };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    select: buildClientAppointmentPreviewSelect(),
    orderBy: { scheduledAt: "desc" },
  });

  return appointments;
}

export async function getAppointmentDetails(appointmentId, authUser) {
  const client = await getClientByUserId(authUser.sub);

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      clientId: client.id,
    },
    select: buildClientAppointmentDetailsSelect(),
  });

  if (!appointment) {
    throw new AppointmentNotFoundError();
  }

  return appointment;
}

export async function cancelAppointment(appointmentId, authUser) {
  const client = await getClientByUserId(authUser.sub);

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      branch: { select: { allowCancellationBeforeHours: true } },
      bookingPayment: true,
    },
  });

  if (!appointment || appointment.clientId !== client.id) {
    throw new AppointmentNotFoundError();
  }

  if (appointment.status === AppointmentStatus.CANCELED) {
    return { appointment, payment: appointment.bookingPayment, message: tr.APPOINTMENT_CANCELED };
  }

  const now = new Date();
  const scheduledTime = new Date(appointment.scheduledAt);
  const hoursRemaining = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursRemaining < appointment.branch.allowCancellationBeforeHours) {
    throw new AppointmentCancellationNotAllowedError();
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedAppt = await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CANCELED },
    });

    let updatedPayment = appointment.bookingPayment;
    if (appointment.bookingPayment && appointment.bookingPayment.status === PaymentStatus.PAID) {
      updatedPayment = await tx.bookingPayment.update({
        where: { appointmentId },
        data: { status: PaymentStatus.REFUNDED },
      });

      // Restore offer slot only when:
      // - The booking had an offer applied
      // - The offer is still active (not manually disabled)
      // - The offer is still within its validity period
      // - usedCount is positive (guard against going below 0)
      if (appointment.bookingPayment.appliedOfferId) {
        const now = new Date();
        const offer = await tx.offer.findUnique({
          where: { id: appointment.bookingPayment.appliedOfferId },
          select: { isActive: true, endDate: true, usedCount: true },
        });
        if (offer && offer.isActive && offer.endDate >= now && offer.usedCount > 0) {
          await tx.offer.update({
            where: { id: appointment.bookingPayment.appliedOfferId },
            data: { usedCount: { decrement: 1 } },
          });
        }
        await tx.claimedOffer.update({
          where: {
            clientId_offerId: {
              clientId: client.id,
              offerId: appointment.bookingPayment.appliedOfferId,
            },
          },
          data: {
            isUsed: false,
            usedAt: null,
          },
        });
      }
    }

    return {
      appointment: updatedAppt,
      payment: updatedPayment,
      message: tr.APPOINTMENT_CANCELED,
    };
  });

  return result;
}
