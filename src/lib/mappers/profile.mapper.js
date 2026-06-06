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
  return {
    id: availability.id,
    dayOfWeek: availability.dayOfWeek,
    startTime: availability.startTime,
    endTime: availability.endTime,
    status: availability.status,
  };
}

function mapBranchReview(review) {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    appointmentId: review.appointmentId,
    createdAt: toIsoString(review.createdAt),
    reviewer: review.client
      ? {
        name: review.client.user.name,
        phone: review.client.user.phone,
      }
      : null,
    service: review.service
      ? {
        id: review.service.id,
        name: review.service.name,
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
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: toIsoString(review.createdAt),
    reviewer: review.client
      ? {
        id: review.client.user.id,
        name: review.client.user.name,
        phone: review.client.user.phone,
      }
      : null,
    service: review.service
      ? {
        id: review.service.id,
        name: review.service.name,
      }
      : null,
    appointmentId: review.appointmentId,
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
  return {
    id: branchAdmin.id,
    ownerName: branchAdmin.ownerName,
    email: branchAdmin.email,
    phone: branchAdmin.phone,
    businessName: branchAdmin.businessName,
    category: branchAdmin.category,
    description: branchAdmin.description ?? null,
    logoUrl: branchAdmin.logoUrl ?? null,
    operatingHours: branchAdmin.operatingHours ?? null,
    address: branchAdmin.address,
    city: branchAdmin.city,
    district: branchAdmin.district,
    status: branchAdmin.status,
    isSubscriptionActive: branchAdmin.isSubscriptionActive,
    subscriptionStartedAt: toIsoString(branchAdmin.subscriptionStartedAt),
    emailVerified: branchAdmin.emailVerified,
    phoneVerified: branchAdmin.phoneVerified,
    createdAt: toIsoString(branchAdmin.createdAt),
    updatedAt: toIsoString(branchAdmin.updatedAt),
    plan: mapPlan(branchAdmin.plan),
    bookingSettings: mapBranchSettings(branchAdmin),
    notificationSettings: mapNotificationSettings(branchAdmin),
    branchAvailability: (branchAdmin.branchAvailabilities ?? [])
      .map(mapBranchAvailability)
      .sort((left, right) => left.dayOfWeek - right.dayOfWeek),
  };
}

export function mapBranchPublicProfile(branch, reviews = []) {
  return {
    branch: {
      id: branch.id,
      businessName: branch.businessName,
      category: branch.category,
      description: branch.description ?? null,
      logoUrl: branch.logoUrl ?? null,
      city: branch.city,
      district: branch.district,
      address: branch.address,
      status: branch.status,
      selectedPlan: mapPlan(branch.plan),
      currentSubscription: {
        plan: mapPlan(branch.plan),
        isSubscriptionActive: branch.isSubscriptionActive,
        subscriptionStartedAt: toIsoString(branch.subscriptionStartedAt),
      },
      average_rating: branch.averageRating,
      total_reviews: branch.reviewCount,
      bookingSettings: mapBranchSettings(branch),
      notificationSettings: mapNotificationSettings(branch),
      branchAvailability: (branch.branchAvailabilities ?? []).map(
        mapPublicBranchAvailability,
      ),
    },
    reviews: reviews.map(mapBranchReview),
  };
}

export function mapStaffProfile(user) {
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
    staff: user.staff ? {
      id: user.staff.id,
      profileImageUrl: user.staff.profileImageUrl,
      staffRole: user.staff.staffRole,
      age: user.staff.age,
      commissionPercentage: user.staff.commissionPercentage,
      isActive: user.staff.isActive,
      createdAt: toIsoString(user.staff.createdAt),
      updatedAt: toIsoString(user.staff.updatedAt),
      branch: user.staff.branch ? {
        id: user.staff.branch.id,
        businessName: user.staff.branch.businessName,
        category: user.staff.branch.category,
      } : null,
      professionalProfile: mapStaffProfessionalProfile(user.staff.professionalProfile),
      certificates: (user.staff.certificates || []).map(mapStaffCertificate),
      availabilities: (user.staff.availabilities || []).map(mapStaffAvailability),
      services: (user.staff.services || []).map(mapStaffServiceLink),
      reviews: (user.staff.reviews || []).map(mapStaffReview),
      averageRating: user.staff.averageRating,
      reviewCount: user.staff.reviewCount,
    } : null,
  };
}

export function mapStaffPublicProfile(staff, reviews = []) {
  return {
    average_rating: staff.averageRating,
    total_reviews: staff.reviewCount,
    reviews: reviews.map(mapStaffReview),
    staff: {
      id: staff.id,
      name: staff.user.name,
      profileImageUrl: staff.profileImageUrl,
      staffRole: staff.staffRole,
      isActive: staff.isActive,
    },
  };
}

export function mapClientProfile(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    createdAt: toIsoString(user.createdAt),
    updatedAt: toIsoString(user.updatedAt),
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
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      createdAt: toIsoString(user.createdAt),
      updatedAt: toIsoString(user.updatedAt),
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
