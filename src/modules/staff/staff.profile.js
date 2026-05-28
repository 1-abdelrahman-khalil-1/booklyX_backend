import { BranchStatus, Role } from "../../generated/prisma/client.js";
import { AvailabilityStatus } from "../../generated/prisma/index.js";
import { tr } from "../../lib/i18n/index.js";
import {
    mapStaffProfile,
    mapStaffPublicProfile,
} from "../../lib/mappers/profile.mapper.js";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";

class StaffNotFoundError extends AppError {
    constructor() {
        super(tr.STAFF_NOT_FOUND, 404);
        this.name = "StaffNotFoundError";
    }
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

    return mapStaffProfile(staff);
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

    return mapStaffPublicProfile(staff, reviews);
}
