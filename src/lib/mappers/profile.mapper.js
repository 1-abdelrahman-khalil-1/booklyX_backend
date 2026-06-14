function toIsoString(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function mapPlan(plan) {
  if (!plan) return null;

  return {
    id: plan.id,
    name: plan.name,
    price: plan.price,
    maxStaff: plan.maxStaff,
    maxServices: plan.maxServices,
    loyaltyEnabled: plan.loyaltyEnabled,
    offersEnabled: plan.offersEnabled,
  };
}

function mapBranchSettings(branchAdmin) {
  return {
    allowCancellationBeforeHours: branchAdmin.allowCancellationBeforeHours,
  };
}

function mapNotificationSettings(branchAdmin) {
  return {
    bookingNotificationsEnabled: branchAdmin.bookingNotificationsEnabled,
    marketingNotificationsEnabled: branchAdmin.marketingNotificationsEnabled,
  };
}

function mapUserCore(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    createdAt: toIsoString(user.createdAt),
    updatedAt: toIsoString(user.updatedAt),
  };
}

function mapBranchAvailability(availability) {
  return {
    id: availability.id,
    dayOfWeek: availability.dayOfWeek,
    startTime: availability.startTime,
    endTime: availability.endTime,
    status: availability.status,
    createdAt: toIsoString(availability.createdAt),
    updatedAt: toIsoString(availability.updatedAt),
  };
}

function mapPublicBranchAvailability(availability) {
  const { createdAt, updatedAt, ...rest } = mapBranchAvailability(availability);
  return rest;
}

function mapBaseReview(review) {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    appointmentId: review.appointmentId,
    createdAt: toIsoString(review.createdAt),
    service: review.service
      ? {
        id: review.service.id,
        name: review.service.name,
      }
      : null,
  };
}

function mapBranchReview(review) {
  return {
    ...mapBaseReview(review),
    reviewer: review.client
      ? {
        name: review.client.user.name,
        phone: review.client.user.phone,
      }
      : null,
    staff: review.staff
      ? {
        id: review.staff.id,
        name: review.staff.user.name,
      }
      : null,
  };
}

function mapStaffServiceLink(link) {
  const service = link.service;

  return {
    id: service.id,
    name: service.name,
    description: service.description,
    price: service.price,
    duration_minutes: service.durationMinutes,
    imageUrl: service.imageUrl,
    status: service.status,
  };
}

function mapStaffCertificate(certificate) {
  return {
    id: certificate.id,
    title: certificate.title,
    issuer: certificate.issuer,
    issueDate: toIsoString(certificate.issueDate),
    expiryDate: toIsoString(certificate.expiryDate),
    fileUrl: certificate.fileUrl,
    verified: certificate.verified,
    createdAt: toIsoString(certificate.createdAt),
  };
}

function mapStaffAvailability(availability) {
  return {
    id: availability.id,
    dayOfWeek: availability.dayOfWeek,
    startTime: availability.startTime,
    endTime: availability.endTime,
    status: availability.status,
  };
}

function mapStaffReview(review) {
  return {
    ...mapBaseReview(review),
    reviewer: review.client
      ? {
        id: review.client.user.id,
        name: review.client.user.name,
        phone: review.client.user.phone,
      }
      : null,
  };
}

function mapStaffProfessionalProfile(profile) {
  if (!profile) return null;

  return {
    id: profile.id,
    bio: profile.bio,
    experience: profile.yearsOfExperience,
    licenseNumber: profile.licenseNumber,
    specialization: profile.specialization,
    createdAt: toIsoString(profile.createdAt),
    updatedAt: toIsoString(profile.updatedAt),
  };
}

function mapBranchAdminSummary(branchAdmin) {
  return {
    id: branchAdmin.id,
    businessName: branchAdmin.businessName,
    status: branchAdmin.status,
    isSubscriptionActive: branchAdmin.isSubscriptionActive,
    subscriptionStartedAt: toIsoString(branchAdmin.subscriptionStartedAt),
    plan: mapPlan(branchAdmin.plan),
  };
}

function mapStaffSummary(staff) {
  return {
    id: staff.id,
    branchId: staff.branchId,
    profileImageUrl: staff.profileImageUrl ?? null,
    age: staff.age,
    staffRole: staff.staffRole,
    commissionPercentage: staff.commissionPercentage,
    professionalProfile: mapStaffProfessionalProfile(staff.professionalProfile),
    averageRating: staff.averageRating,
    reviewCount: staff.reviewCount,
  };
}

export function mapBranchAdminProfile(branchAdmin) {
  const summary = mapBranchAdminSummary(branchAdmin);
  return {
    ...summary,
    ownerName: branchAdmin.ownerName,
    email: branchAdmin.email,
    phone: branchAdmin.phone,
    category: branchAdmin.category,
    description: branchAdmin.description ?? null,
    logoUrl: branchAdmin.logoUrl ?? null,
    operatingHours: branchAdmin.operatingHours ?? null,
    address: branchAdmin.address,
    city: branchAdmin.city,
    district: branchAdmin.district,
    emailVerified: branchAdmin.emailVerified,
    phoneVerified: branchAdmin.phoneVerified,
    createdAt: toIsoString(branchAdmin.createdAt),
    updatedAt: toIsoString(branchAdmin.updatedAt),
    bookingSettings: mapBranchSettings(branchAdmin),
    notificationSettings: mapNotificationSettings(branchAdmin),
    branchAvailability: (branchAdmin.branchAvailabilities ?? [])
      .map(mapBranchAvailability)
      .sort((left, right) => left.dayOfWeek - right.dayOfWeek),
  };
}

export function mapBranchPublicProfile(/** @type {import("../../generated/prisma/index.js").BranchAdmin} */branch, reviews = []) {
  const adminProfile = mapBranchAdminProfile(branch);
  return {
    branch: {
      ...adminProfile,
      selectedPlan: adminProfile.plan,
      currentSubscription: {
        plan: adminProfile.plan,
        isSubscriptionActive: adminProfile.isSubscriptionActive,
        subscriptionStartedAt: adminProfile.subscriptionStartedAt,
      },
      average_rating: branch.averageRating,
      total_reviews: branch.reviewCount,
      branchAvailability: adminProfile.branchAvailability.map(avail => {
        const { createdAt, updatedAt, ...rest } = avail;
        return rest;
      }),
    },
    reviews: reviews.map(mapBranchReview),
  };
}

export function mapStaffProfile(user) {
  if (!user) return null;

  let staffData = null;
  if (user.staff) {
    const { branchId, ...summary } = mapStaffSummary(user.staff);
    staffData = {
      ...summary,
      isActive: user.staff.isActive,
      createdAt: toIsoString(user.staff.createdAt),
      updatedAt: toIsoString(user.staff.updatedAt),
      branch: user.staff.branch ? {
        id: user.staff.branch.id,
        businessName: user.staff.branch.businessName,
        category: user.staff.branch.category,
      } : null,
      certificates: (user.staff.certificates || []).map(mapStaffCertificate),
      availabilities: (user.staff.availabilities || []).map(mapStaffAvailability),
      services: (user.staff.services || []).map(mapStaffServiceLink),
      reviews: (user.staff.reviews || []).map(mapStaffReview),
    };
  }

  return {
    ...mapUserCore(user),
    staff: staffData,
  };
}

export function mapStaffPublicProfile(staff, reviews = []) {
  const profile = mapStaffProfile({
    ...staff.user,
    staff,
  });

  if (!profile || !profile.staff) {
    return {
      average_rating: staff.averageRating,
      total_reviews: staff.reviewCount,
      reviews: reviews.map(mapStaffReview),
      staff: {
        id: staff.id,
        name: staff.user?.name ?? "",
        profileImageUrl: staff.profileImageUrl ?? null,
        staffRole: staff.staffRole,
        isActive: staff.isActive,
      },
    };
  }

  return {
    average_rating: staff.averageRating,
    total_reviews: staff.reviewCount,
    reviews: reviews.map(mapStaffReview),
    staff: {
      id: profile.staff.id,
      name: profile.name,
      profileImageUrl: profile.staff.profileImageUrl,
      staffRole: profile.staff.staffRole,
      isActive: profile.staff.isActive,
    },
  };
}

export function mapClientProfile(user) {
  if (!user) return null;
  return {
    ...mapUserCore(user),
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    client: user.client
      ? {
        id: user.client.id,
        profileImageUrl: user.client.profileImageUrl ?? null,
        createdAt: toIsoString(user.client.createdAt),
        updatedAt: toIsoString(user.client.updatedAt),
      }
      : null,
  };
}

export function mapAdminUserProfile(user) {
  return {
    user: {
      ...mapUserCore(user),
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      branchAdmin: user.branchAdmin ? mapBranchAdminSummary(user.branchAdmin) : null,
      staff: user.staff ? mapStaffSummary(user.staff) : null,
    },
  };
}

export {
  mapBranchAvailability,
  mapBranchSettings,
  mapNotificationSettings,
  mapPlan,
  mapStaffAvailability,
  mapStaffCertificate,
  mapStaffProfessionalProfile,
  mapStaffReview,
  mapStaffServiceLink,
  toIsoString
};
