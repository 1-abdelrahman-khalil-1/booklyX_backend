import { BranchStatus, Role } from "../../generated/prisma/client.js";
import { AvailabilityStatus } from "../../generated/prisma/index.js";
import { tr } from "../../lib/i18n/index.js";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";

class StaffNotFoundError extends AppError {
    constructor() {
        super(tr.STAFF_NOT_FOUND, 404);
        this.name = "StaffNotFoundError";
    }
}

function toIsoString(value) {
    if (!value) return null;
    return value instanceof Date ? value.toISOString() : value;
}

function mapServiceLink(link) {
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

function mapCertificate(certificate) {
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

function mapAvailability(availability) {
    return {
        id: availability.id,
        dayOfWeek: availability.dayOfWeek,
        startTime: availability.startTime,
        endTime: availability.endTime,
        status: availability.status,
    };
}

function mapReview(review) {
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

export async function getStaffProfile(userId) {
    const staff = await prisma.staff.findUnique({
        where: { userId },
        select: {
            id: true,
            profileImageUrl: true,
            age: true,
            staffRole: true,
            commissionPercentage: true,
            isActive: true,
            averageRating: true,
            reviewCount: true,
            createdAt: true,
            updatedAt: true,
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    role: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                },
            },
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
                where: {
                    status: AvailabilityStatus.AVAILABLE,
                },
                select: {
                    id: true,
                    dayOfWeek: true,
                    startTime: true,
                    endTime: true,
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
                        },
                    },
                },
            },
            reviews: {
                where: {
                    isVisible: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
                select: {
                    id: true,
                    rating: true,
                    comment: true,
                    appointmentId: true,
                    createdAt: true,
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
        },
    });

    if (!staff) {
        throw new StaffNotFoundError();
    }

    return {
        user: {
            id: staff.user.id,
            name: staff.user.name,
            email: staff.user.email,
            phone: staff.user.phone,
            role: staff.user.role,
            status: staff.user.status,
            createdAt: toIsoString(staff.user.createdAt),
            updatedAt: toIsoString(staff.user.updatedAt),
            staff: {
                id: staff.id,
                profileImageUrl: staff.profileImageUrl,
                staffRole: staff.staffRole,
                age: staff.age,
                commissionPercentage: staff.commissionPercentage,
                isActive: staff.isActive,
                createdAt: toIsoString(staff.createdAt),
                updatedAt: toIsoString(staff.updatedAt),
                branch: {
                    id: staff.branch.id,
                    businessName: staff.branch.businessName,
                    category: staff.branch.category,
                },
                professionalProfile: staff.professionalProfile
                    ? {
                        id: staff.professionalProfile.id,
                        bio: staff.professionalProfile.bio,
                        experience: staff.professionalProfile.yearsOfExperience,
                        licenseNumber: staff.professionalProfile.licenseNumber,
                        specialization: staff.professionalProfile.specialization,
                        createdAt: toIsoString(staff.professionalProfile.createdAt),
                        updatedAt: toIsoString(staff.professionalProfile.updatedAt),
                    }
                    : null,
                certificates: (staff.certificates || []).map(mapCertificate),
                availabilities: (staff.availabilities || []).map(mapAvailability),
                services: (staff.services || []).map(mapServiceLink),
                reviews: (staff.reviews || []).map(mapReview),
                averageRating: staff.averageRating,
                reviewCount: staff.reviewCount,
            },
        },
    };
}

export async function getStaffPublicProfile(staffId, authUser) {
    const staff = await prisma.staff.findUnique({
        where: { id: Number(staffId) },
        select: {
            id: true,
            profileImageUrl: true,
            age: true,
            staffRole: true,
            commissionPercentage: true,
            isActive: true,
            averageRating: true,
            reviewCount: true,
            createdAt: true,
            updatedAt: true,
            user: {
                select: { id: true, name: true },
            },
            branch: {
                select: {
                    id: true,
                    businessName: true,
                    status: true,
                    isSubscriptionActive: true,
                },
            },
        },
    });

    if (!staff) {
        throw new StaffNotFoundError();
    }

    // If requester is branch_admin, ensure staff belongs to their branch
    if (authUser && authUser.role === Role.branch_admin) {
        const branch = await prisma.branchAdmin.findUnique({ where: { userId: authUser.sub }, select: { id: true } });
        if (!branch || branch.id !== staff.branch.id) {
            throw new AppError(tr.FORBIDDEN, 403);
        }
    } else if (!(authUser && authUser.role === Role.super_admin)) {
        // For clients and unauthenticated requesters, enforce branch visibility
        if (staff.branch.status !== BranchStatus.APPROVED || !staff.branch.isSubscriptionActive) {
            throw new StaffNotFoundError();
        }
    }

    // Fetch only latest 5 visible reviews for lightweight profile preview
    const reviews = await prisma.review.findMany({
        where: { staffId: staff.id, isVisible: true },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            rating: true,
            comment: true,
            appointmentId: true,
            createdAt: true,
            client: { select: { user: { select: { id: true, name: true, phone: true } } } },
            service: { select: { id: true, name: true } },
        },
    });

    const formatted = reviews.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        appointmentId: r.appointmentId,
        createdAt: r.createdAt ? r.createdAt.toISOString() : null,
        reviewer: r.client ? { id: r.client.user.id, name: r.client.user.name, phone: r.client.user.phone } : null,
        service: r.service ? { id: r.service.id, name: r.service.name } : null,
    }));

    return {
        average_rating: staff.averageRating,
        total_reviews: staff.reviewCount,
        reviews: formatted,
        staff: {
            id: staff.id,
            name: staff.user.name,
            profileImageUrl: staff.profileImageUrl,
            staffRole: staff.staffRole,
            isActive: staff.isActive,
        },
    };
}
