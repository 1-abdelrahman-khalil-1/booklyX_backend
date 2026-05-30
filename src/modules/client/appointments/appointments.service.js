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
import { getClientByUserId } from "../helpers.js";
import {
  calculateBestOfferForService,
  safeIncrementOfferUsedCount,
} from "../../branch_admin/offers/offers.service.js";
import {
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

  const offerCalc = await calculateBestOfferForService(serviceId);
  const originalAmount = Math.round(service.price);
  const discountAmount = Math.round(offerCalc.savingsAmount);
  const finalAmount = Math.max(0, originalAmount - discountAmount);
  const appliedOfferId = offerCalc.appliedOffer?.id ?? null;

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
      appliedOffer: appliedOfferId
        ? {
            id: offerCalc.appliedOffer.id,
            title: offerCalc.appliedOffer.title,
            discountType: offerCalc.appliedOffer.discountType,
            discountValue: offerCalc.appliedOffer.discountValue,
          }
        : null,
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

export async function getClientAppointments(authUser) {
  const client = await getClientByUserId(authUser.sub);

  const appointments = await prisma.appointment.findMany({
    where: { clientId: client.id },
    include: {
      service: { select: { id: true, name: true, price: true, durationMinutes: true, imageUrl: true } },
      staff: { include: { user: { select: { name: true } } } },
      branch: { select: { id: true, businessName: true, logoUrl: true } },
      bookingPayment: true,
    },
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
    include: {
      service: { select: { id: true, name: true, price: true, durationMinutes: true, imageUrl: true, description: true } },
      staff: { include: { user: { select: { name: true } } } },
      branch: { select: { id: true, businessName: true, logoUrl: true, address: true, phone: true } },
      bookingPayment: true,
    },
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
