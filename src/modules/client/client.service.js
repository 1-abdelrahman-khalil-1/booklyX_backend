import {
  AppointmentStatus,
  AvailabilityStatus,
  BranchStatus,
  BusinessCategory,
  PaymentStatus,
  Role,
  ServiceApprovalStatus,
} from "../../generated/prisma/client.js";
import { tr } from "../../lib/i18n/index.js";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import dayjs from "dayjs";
import {
  mapBranchPublicProfile,
  mapStaffPublicProfile,
} from "../../lib/mappers/profile.mapper.js";
import {
  calculateBestOfferForService,
  incrementOfferUsedCount,
} from "../offers/offers.service.js";

// --- Domain Errors ---
export class ClientValidationError extends AppError {
  constructor(message, params) {
    super(message, 400, params);
    this.name = "ClientValidationError";
  }
}

export class ClientNotFoundError extends AppError {
  constructor() {
    super(tr.CLIENT_NOT_FOUND, 404);
    this.name = "ClientNotFoundError";
  }
}

export class BranchNotFoundError extends AppError {
  constructor() {
    super(tr.BRANCH_NOT_FOUND, 404);
    this.name = "BranchNotFoundError";
  }
}

export class StaffNotFoundError extends AppError {
  constructor() {
    super(tr.STAFF_NOT_FOUND, 404);
    this.name = "StaffNotFoundError";
  }
}

export class ServiceNotFoundError extends AppError {
  constructor() {
    super(tr.SERVICE_NOT_FOUND, 404);
    this.name = "ServiceNotFoundError";
  }
}

export class ServiceNotBookableError extends AppError {
  constructor() {
    super(tr.SERVICE_NOT_BOOKABLE, 400);
    this.name = "ServiceNotBookableError";
  }
}

export class AppointmentNotFoundError extends AppError {
  constructor() {
    super(tr.APPOINTMENT_NOT_FOUND, 404);
    this.name = "AppointmentNotFoundError";
  }
}

export class DoubleBookingError extends AppError {
  constructor() {
    super(tr.DOUBLE_BOOKING_ERROR, 409);
    this.name = "DoubleBookingError";
  }
}

export class PastBookingError extends AppError {
  constructor() {
    super(tr.PAST_BOOKING_ERROR, 400);
    this.name = "PastBookingError";
  }
}

export class AppointmentCancellationNotAllowedError extends AppError {
  constructor() {
    super(tr.APPOINTMENT_CANCELLATION_NOT_ALLOWED, 400);
    this.name = "AppointmentCancellationNotAllowedError";
  }
}

export class FavouriteAlreadyExistsError extends AppError {
  constructor() {
    super(tr.FAVOURITE_ALREADY_EXISTS, 409);
    this.name = "FavouriteAlreadyExistsError";
  }
}

export class FavouriteNotFoundError extends AppError {
  constructor() {
    super(tr.FAVOURITE_NOT_FOUND, 404);
    this.name = "FavouriteNotFoundError";
  }
}

// Helper to ensure client model exists for current user
async function getClientByUserId(userId) {
  const client = await prisma.client.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!client) {
    throw new ClientNotFoundError();
  }
  return client;
}

// --- Services ---

/**
 * 1. Home Dashboard Feeds
 */
export async function getHomeDashboard(query, authUser) {
  const lat = query.lat ? parseFloat(query.lat) : 30.0444;
  const lng = query.lng ? parseFloat(query.lng) : 31.2357;
  const radius = query.radius ? parseFloat(query.radius) : 5.0;
  const radiusMeters = radius * 1000;

  // Active Offers Carousel (belonging to APPROVED visible branches)
  const offers = await prisma.offer.findMany({
    where: {
      isActive: true,
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
      branch: {
        status: BranchStatus.APPROVED,
        isSubscriptionActive: true,
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      discountType: true,
      discountValue: true,
      imageUrl: true,
      branchId: true,
      branch: {
        select: {
          businessName: true,
        },
      },
    },
    take: 10,
  });

  // Business Categories List
  const categories = Object.values(BusinessCategory);

  // Nearby Highlighted Providers within 5km, sorted by distance
  const nearbyProviders = await prisma.$queryRaw`
    SELECT id, businessName as name, category, description, logoUrl as profileImage, averageRating as rating, reviewCount as totalReviews, latitude, longitude,
           ST_Distance_Sphere(point(longitude, latitude), point(${lng}, ${lat})) as distance
    FROM BranchAdmin
    WHERE status = 'APPROVED' AND isSubscriptionActive = 1
    HAVING distance <= ${radiusMeters}
    ORDER BY distance ASC
    LIMIT 10
  `;

  // Parse distance numeric floats and structure coordinates
  const providersArray = Array.isArray(nearbyProviders) ? nearbyProviders : [];
  const formattedProviders = providersArray.map((provider) => ({
    id: provider.id,
    name: provider.name,
    category: provider.category,
    description: provider.description,
    profileImage: provider.profileImage,
    rating: Number(provider.rating || 0),
    totalReviews: Number(provider.totalReviews || 0),
    location: {
      lat: Number(provider.latitude),
      lng: Number(provider.longitude),
    },
    distance: Number((provider.distance / 1000).toFixed(2)), // in km
  }));

  return {
    offers,
    categories,
    nearbyProviders: formattedProviders,
  };
}

/**
 * 2. Discovery & Map Search
 */
export async function searchBranches(query) {
  const lat = parseFloat(query.lat);
  const lng = parseFloat(query.lng);
  const radius = query.radius ? parseFloat(query.radius) : 5.0;
  const radiusMeters = radius * 1000;
  const category = query.category;
  const search = query.search;

  // Search branches utilizing spatial distance calculations (ST_Distance_Sphere)
  // Filter by category and search text. Strictly sorted by less distance first, then high rating.
  let branches;
  if (category && search) {
    branches = await prisma.$queryRaw`
      SELECT id, businessName as name, category, description, logoUrl as profileImage, averageRating as rating, reviewCount as totalReviews, latitude, longitude,
             ST_Distance_Sphere(point(longitude, latitude), point(${lng}, ${lat})) as distance
      FROM BranchAdmin
      WHERE status = 'APPROVED' AND isSubscriptionActive = 1 AND category = ${category} AND businessName LIKE CONCAT('%', ${search}, '%')
      HAVING distance <= ${radiusMeters}
      ORDER BY distance ASC, rating DESC
    `;
  } else if (category && !search) {
    branches = await prisma.$queryRaw`
      SELECT id, businessName as name, category, description, logoUrl as profileImage, averageRating as rating, reviewCount as totalReviews, latitude, longitude,
             ST_Distance_Sphere(point(longitude, latitude), point(${lng}, ${lat})) as distance
      FROM BranchAdmin
      WHERE status = 'APPROVED' AND isSubscriptionActive = 1 AND category = ${category}
      HAVING distance <= ${radiusMeters}
      ORDER BY distance ASC, rating DESC
    `;
  } else if (!category && search) {
    branches = await prisma.$queryRaw`
      SELECT id, businessName as name, category, description, logoUrl as profileImage, averageRating as rating, reviewCount as totalReviews, latitude, longitude,
             ST_Distance_Sphere(point(longitude, latitude), point(${lng}, ${lat})) as distance
      FROM BranchAdmin
      WHERE status = 'APPROVED' AND isSubscriptionActive = 1 AND businessName LIKE CONCAT('%', ${search}, '%')
      HAVING distance <= ${radiusMeters}
      ORDER BY distance ASC, rating DESC
    `;
  } else {
    branches = await prisma.$queryRaw`
      SELECT id, businessName as name, category, description, logoUrl as profileImage, averageRating as rating, reviewCount as totalReviews, latitude, longitude,
             ST_Distance_Sphere(point(longitude, latitude), point(${lng}, ${lat})) as distance
      FROM BranchAdmin
      WHERE status = 'APPROVED' AND isSubscriptionActive = 1
      HAVING distance <= ${radiusMeters}
      ORDER BY distance ASC, rating DESC
    `;
  }

  const branchesArray = Array.isArray(branches) ? branches : [];
  const formattedBranches = branchesArray.map((b) => ({
    id: b.id,
    name: b.name,
    rating: Number(b.rating || 0),
    totalReviews: Number(b.totalReviews || 0),
    profileImage: b.profileImage,
    topServiceCategories: [b.category],
    location: {
      lat: Number(b.latitude),
      lng: Number(b.longitude),
    },
    distance: Number((b.distance / 1000).toFixed(2)),
  }));

  return formattedBranches;
}

/**
 * 3. Fetch Branch Public Profile
 */
export async function getBranchProfile(branchId) {
  const branch = await prisma.branchAdmin.findUnique({
    where: { id: branchId },
    include: {
      plan: true,
      branchAvailabilities: true,
    },
  });

  if (!branch || branch.status !== BranchStatus.APPROVED || !branch.isSubscriptionActive) {
    throw new BranchNotFoundError();
  }

  // Get recent 10 reviews
  const reviews = await prisma.review.findMany({
    where: { branchId },
    include: {
      client: {
        include: {
          user: {
            select: { name: true, phone: true },
          },
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
  });

  return mapBranchPublicProfile(branch, reviews);
}

/**
 * 4. List Branch Services
 */
export async function getBranchServices(branchId) {
  const branch = await prisma.branchAdmin.findUnique({
    where: { id: branchId },
    select: { id: true, status: true, isSubscriptionActive: true },
  });

  if (!branch || branch.status !== BranchStatus.APPROVED || !branch.isSubscriptionActive) {
    throw new BranchNotFoundError();
  }

  const services = await prisma.service.findMany({
    where: {
      branchId,
      status: ServiceApprovalStatus.APPROVED,
    },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      durationMinutes: true,
      imageUrl: true,
      serviceCategoryId: true,
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  return services;
}

/**
 * 5. List Staff by Service
 */
export async function getServiceStaff(serviceId) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, status: true, branchId: true },
  });

  if (!service || service.status !== ServiceApprovalStatus.APPROVED) {
    throw new ServiceNotFoundError();
  }

  const staffList = await prisma.staff.findMany({
    where: {
      isActive: true,
      branchId: service.branchId,
      services: {
        some: {
          serviceId: service.id,
        },
      },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      professionalProfile: true,
    },
  });

  return staffList.map((s) => ({
    id: s.id,
    name: s.user.name,
    profileImageUrl: s.profileImageUrl,
    role: s.staffRole,
    averageRating: s.averageRating,
    reviewCount: s.reviewCount,
    specialization: s.professionalProfile?.specialization || null,
  }));
}

/**
 * 6. Get Staff Public Profile
 */
export async function getStaffProfile(staffId) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: {
      user: {
        select: { name: true },
      },
    },
  });

  if (!staff || !staff.isActive) {
    throw new StaffNotFoundError();
  }

  const reviews = await prisma.review.findMany({
    where: { staffId },
    include: {
      client: {
        include: {
          user: { select: { id: true, name: true, phone: true } },
        },
      },
      service: { select: { id: true, name: true } },
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  return mapStaffPublicProfile(staff, reviews);
}

/**
 * 7. Calculate Available Days for Staff
 */
export async function getStaffAvailableDays(staffId, serviceId) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true, isActive: true },
  });
  if (!staff || !staff.isActive) {
    throw new StaffNotFoundError();
  }

  // Get staff schedules
  const availabilities = await prisma.staffAvailability.findMany({
    where: {
      staffId,
      status: AvailabilityStatus.AVAILABLE,
    },
    select: {
      dayOfWeek: true,
    },
  });

  const activeDays = new Set(availabilities.map((a) => a.dayOfWeek));
  const availableDays = [];

  // Generate calendar days for the next 30 days
  for (let i = 0; i < 30; i++) {
    const day = dayjs().add(i, "day");
    if (activeDays.has(day.day())) {
      availableDays.push(day.format("YYYY-MM-DD"));
    }
  }

  return {
    staffId,
    serviceId,
    availableDays,
  };
}

/**
 * 8. Calculate Available Time Slots for Staff on Date
 */
export async function getStaffAvailableSlots(staffId, serviceId, dateStr) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true, isActive: true, branchId: true },
  });
  if (!staff || !staff.isActive) {
    throw new StaffNotFoundError();
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, durationMinutes: true, status: true, branchId: true },
  });

  if (!service || service.status !== ServiceApprovalStatus.APPROVED || service.branchId !== staff.branchId) {
    throw new ServiceNotFoundError();
  }

  const targetDate = dayjs(dateStr).toDate();
  const dayOfWeek = dayjs(targetDate).day();

  // Get availability
  const availability = await prisma.staffAvailability.findUnique({
    where: {
      staffId_dayOfWeek: {
        staffId,
        dayOfWeek,
      },
    },
  });

  if (!availability || availability.status === AvailabilityStatus.UNAVAILABLE) {
    return {
      date: dateStr,
      serviceId,
      slots: [],
      available: false,
    };
  }

  const [startHour = 0, startMin = 0] = availability.startTime.split(":").map(Number);
  const [endHour = 0, endMin = 0] = availability.endTime.split(":").map(Number);

  let dayStart = dayjs(targetDate).hour(startHour).minute(startMin).second(0).millisecond(0).toDate();
  let dayEnd = dayjs(targetDate).hour(endHour).minute(endMin).second(0).millisecond(0).toDate();

  // Handle past times if target date is today
  const now = new Date();
  if (dayStart < now) {
    dayStart = now;
  }

  // Fetch already booked appointments
  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      staffId,
      status: {
        in: [AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS],
      },
      scheduledAt: {
        gte: dayjs(targetDate).startOf("day").toDate(),
        lte: dayjs(targetDate).endOf("day").toDate(),
      },
    },
    select: {
      scheduledAt: true,
      service: {
        select: { durationMinutes: true },
      },
    },
  });

  const slots = [];
  let currentTime = dayStart;

  while (currentTime.getTime() + service.durationMinutes * 60 * 1000 <= dayEnd.getTime()) {
    const slotEnd = dayjs(currentTime).add(service.durationMinutes, "minute").toDate();

    const isBooked = bookedAppointments.some((apt) => {
      const aptStart = apt.scheduledAt;
      const aptEnd = dayjs(aptStart).add(apt.service.durationMinutes, "minute").toDate();
      return !(slotEnd <= aptStart || currentTime >= aptEnd);
    });

    if (!isBooked) {
      slots.push({
        startTime: currentTime.toISOString(),
        endTime: slotEnd.toISOString(),
      });
    }

    currentTime = slotEnd;
  }

  return {
    date: dateStr,
    serviceId,
    slots,
    available: slots.length > 0,
  };
}

/**
 * 9. Appointment Booking: Reserve Slot (PENDING)
 */
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

  // Prevent past bookings
  if (start <= new Date()) {
    throw new PastBookingError();
  }

  // Prevent double booking
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

  // ── Offer pricing snapshot ─────────────────────────────────────────────────
  // calculateBestOfferForService selects the offer that gives the highest
  // saving for this service at the moment of reservation. The result is
  // persisted as-is — it will NOT be recalculated at payment time.
  const offerCalc = await calculateBestOfferForService(serviceId);
  const originalAmount = Math.round(service.price);
  const discountAmount = Math.round(offerCalc.savingsAmount);
  const finalAmount = Math.max(0, originalAmount - discountAmount);
  const appliedOfferId = offerCalc.appliedOffer?.id ?? null;
  // ──────────────────────────────────────────────────────────────────────────

  // Create PENDING appointment and booking payment atomically
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
    };
  });

  return result;
}

/**
 * 10. Process Fake Payment and Confirm Booking
 */
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
      // Confirm appointment and mark payment as PAID
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

      // Increment offer usage count if this booking had an offer applied.
      // Eligibility was locked at reservation time — no revalidation needed.
      if (appointment.bookingPayment?.appliedOfferId) {
        await incrementOfferUsedCount(appointment.bookingPayment.appliedOfferId, tx);
      }

      return {
        appointment: updatedAppt,
        payment: updatedPayment,
        message: tr.PAYMENT_CONFIRMED_SUCCESSFULLY,
      };
    } else {
      // failed payment leaves the appointment PENDING
      const updatedPayment = await tx.bookingPayment.update({
        where: { appointmentId },
        data: { status: PaymentStatus.FAILED },
      });

      return {
        appointment,
        payment: updatedPayment,
        message: tr.INVALID_CREDENTIALS, // generic payment failure key
      };
    }
  });

  return result;
}

/**
 * 11. List Appointments (Historical and Upcoming)
 */
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

/**
 * 12. Fetch Booking Details
 */
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

/**
 * 13. Cancel Appointment
 */
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

  // Strict Cancellation Window Enforcement
  const now = new Date();
  const scheduledTime = new Date(appointment.scheduledAt);
  const hoursRemaining = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursRemaining < appointment.branch.allowCancellationBeforeHours) {
    throw new AppointmentCancellationNotAllowedError();
  }

  // Cancel and transition payment to REFUNDED if paid
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
    }

    return {
      appointment: updatedAppt,
      payment: updatedPayment,
      message: tr.APPOINTMENT_CANCELED,
    };
  });

  return result;
}

/**
 * 14. Favorites Management
 */
export async function addFavoriteBranch(branchId, authUser) {
  const client = await getClientByUserId(authUser.sub);

  const branch = await prisma.branchAdmin.findUnique({
    where: { id: branchId },
    select: { id: true, status: true },
  });

  if (!branch || branch.status !== BranchStatus.APPROVED) {
    throw new BranchNotFoundError();
  }

  const existing = await prisma.favoriteBranch.findUnique({
    where: {
      clientId_branchId: {
        clientId: client.id,
        branchId,
      },
    },
  });

  if (existing) {
    throw new FavouriteAlreadyExistsError();
  }

  const fav = await prisma.favoriteBranch.create({
    data: {
      clientId: client.id,
      branchId,
    },
  });

  return fav;
}

export async function removeFavoriteBranch(branchId, authUser) {
  const client = await getClientByUserId(authUser.sub);

  const fav = await prisma.favoriteBranch.findUnique({
    where: {
      clientId_branchId: {
        clientId: client.id,
        branchId,
      },
    },
  });

  if (!fav) {
    throw new FavouriteNotFoundError();
  }

  await prisma.favoriteBranch.delete({
    where: {
      clientId_branchId: {
        clientId: client.id,
        branchId,
      },
    },
  });

  return { branchId };
}

export async function addFavoriteStaff(staffId, authUser) {
  const client = await getClientByUserId(authUser.sub);

  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true, isActive: true },
  });

  if (!staff || !staff.isActive) {
    throw new StaffNotFoundError();
  }

  const existing = await prisma.favoriteStaff.findUnique({
    where: {
      clientId_staffId: {
        clientId: client.id,
        staffId,
      },
    },
  });

  if (existing) {
    throw new FavouriteAlreadyExistsError();
  }

  const fav = await prisma.favoriteStaff.create({
    data: {
      clientId: client.id,
      staffId,
    },
  });

  return fav;
}

export async function removeFavoriteStaff(staffId, authUser) {
  const client = await getClientByUserId(authUser.sub);

  const fav = await prisma.favoriteStaff.findUnique({
    where: {
      clientId_staffId: {
        clientId: client.id,
        staffId,
      },
    },
  });

  if (!fav) {
    throw new FavouriteNotFoundError();
  }

  await prisma.favoriteStaff.delete({
    where: {
      clientId_staffId: {
        clientId: client.id,
        staffId,
      },
    },
  });

  return { staffId };
}

export async function getClientFavourites(query, authUser) {
  const client = await getClientByUserId(authUser.sub);
  const type = query.type; // "branch_admin" or "staff" or undefined

  let branches = [];
  let staffList = [];

  if (!type || type === "branch_admin") {
    const favBranches = await prisma.favoriteBranch.findMany({
      where: { clientId: client.id },
      include: {
        branch: {
          select: {
            id: true,
            businessName: true,
            category: true,
            logoUrl: true,
            city: true,
            district: true,
            averageRating: true,
            reviewCount: true,
          },
        },
      },
    });
    branches = favBranches.map((fav) => ({
      id: fav.branch.id,
      name: fav.branch.businessName,
      category: fav.branch.category,
      logoUrl: fav.branch.logoUrl,
      city: fav.branch.city,
      district: fav.branch.district,
      rating: fav.branch.averageRating,
      totalReviews: fav.branch.reviewCount,
    }));
  }

  if (!type || type === "staff") {
    const favStaff = await prisma.favoriteStaff.findMany({
      where: { clientId: client.id },
      include: {
        staff: {
          include: {
            user: { select: { name: true } },
            professionalProfile: { select: { specialization: true } },
          },
        },
      },
    });
    staffList = favStaff.map((fav) => ({
      id: fav.staff.id,
      name: fav.staff.user.name,
      profileImageUrl: fav.staff.profileImageUrl,
      role: fav.staff.staffRole,
      averageRating: fav.staff.averageRating,
      reviewCount: fav.staff.reviewCount,
      specialization: fav.staff.professionalProfile?.specialization || null,
    }));
  }

  return {
    branches,
    staff: staffList,
  };
}
