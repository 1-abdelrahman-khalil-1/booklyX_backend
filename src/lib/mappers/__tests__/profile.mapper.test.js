import { describe, expect, it } from "@jest/globals";
import {
  mapAdminUserProfile,
  mapBranchAdminProfile,
  mapBranchPublicProfile,
  mapStaffProfile,
  mapStaffPublicProfile,
} from "../profile.mapper.js";

describe("profile.mapper", () => {
  it("maps branch admin profiles with explicit safe fields", () => {
    const result = mapBranchAdminProfile({
      id: 1,
      ownerName: "Branch Owner",
      email: "branch@example.com",
      phone: "01000000001",
      businessName: "Prime Salon",
      category: "SPA",
      description: null,
      logoUrl: "https://cdn.example.com/logo.png",
      operatingHours: "09:00-22:00",
      address: "123 Street",
      city: "Cairo",
      district: "Nasr City",
      status: "APPROVED",
      isSubscriptionActive: true,
      subscriptionStartedAt: new Date("2026-05-25T12:00:00.000Z"),
      emailVerified: true,
      phoneVerified: true,
      createdAt: new Date("2026-04-09T10:15:00.000Z"),
      updatedAt: new Date("2026-05-25T12:00:00.000Z"),
      plan: {
        id: 1,
        name: "Basic",
        price: 199,
        maxStaff: 5,
        maxServices: 10,
        loyaltyEnabled: true,
        offersEnabled: true,
      },
      allowCancellationBeforeHours: 4,
      bookingNotificationsEnabled: true,
      marketingNotificationsEnabled: false,
      branchAvailabilities: [
        {
          id: 2,
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
          status: "AVAILABLE",
          createdAt: new Date("2026-05-01T10:00:00.000Z"),
          updatedAt: new Date("2026-05-01T10:00:00.000Z"),
        },
      ],
    });

    expect(result).toMatchObject({
      ownerName: "Branch Owner",
      plan: {
        id: 1,
        name: "Basic",
      },
      bookingSettings: { allowCancellationBeforeHours: 4 },
      notificationSettings: {
        bookingNotificationsEnabled: true,
        marketingNotificationsEnabled: false,
      },
      branchAvailability: [
        {
          id: 2,
          dayOfWeek: 1,
          status: "AVAILABLE",
        },
      ],
    });
  });

  it("maps staff profiles with nested safe substructures", () => {
    const result = mapStaffProfile({
      id: 7,
      profileImageUrl: "https://cdn.example.com/staff.png",
      staffRole: "BARBER",
      age: 28,
      commissionPercentage: 15,
      isActive: true,
      averageRating: 4.7,
      reviewCount: 34,
      createdAt: new Date("2026-04-01T10:00:00.000Z"),
      updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      user: {
        id: 9,
        name: "Mazen Tamer",
        email: "mazen.tamer@booklyx.com",
        phone: "01000000021",
        role: "staff",
        status: "ACTIVE",
        createdAt: new Date("2026-04-01T10:00:00.000Z"),
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
      branch: {
        id: 1,
        businessName: "Hassan Beauty Salon",
        category: "SPA",
      },
      professionalProfile: {
        id: 3,
        bio: "Senior stylist",
        yearsOfExperience: 6,
        licenseNumber: "BARB-7845",
        specialization: "BARBER",
        createdAt: new Date("2026-04-02T10:00:00.000Z"),
        updatedAt: new Date("2026-05-02T10:00:00.000Z"),
      },
      certificates: [],
      availabilities: [],
      services: [],
      reviews: [],
    });

    expect(result.user.staff).toMatchObject({
      staffRole: "BARBER",
      professionalProfile: {
        experience: 6,
        licenseNumber: "BARB-7845",
      },
      averageRating: 4.7,
      reviewCount: 34,
    });
  });

  it("maps admin user profiles using safe nested summaries", () => {
    const result = mapAdminUserProfile({
      id: 1,
      name: "Admin User",
      email: "admin@booklyx.com",
      phone: "01000000030",
      role: "super_admin",
      status: "ACTIVE",
      emailVerified: true,
      phoneVerified: true,
      createdAt: new Date("2026-04-09T10:15:00.000Z"),
      updatedAt: new Date("2026-05-01T10:15:00.000Z"),
      branchAdmin: {
        id: 11,
        businessName: "Prime Salon",
        status: "APPROVED",
        isSubscriptionActive: true,
        subscriptionStartedAt: new Date("2026-05-25T12:00:00.000Z"),
        plan: null,
      },
      staff: {
        id: 7,
        branchId: 1,
        profileImageUrl: null,
        age: 28,
        staffRole: "BARBER",
        commissionPercentage: 15,
        professionalProfile: null,
        averageRating: 4.7,
        reviewCount: 34,
      },
    });

    expect(result.user).toMatchObject({
      name: "Admin User",
      branchAdmin: {
        id: 11,
        businessName: "Prime Salon",
        isSubscriptionActive: true,
      },
      staff: {
        id: 7,
        branchId: 1,
        averageRating: 4.7,
      },
    });
  });

  it("maps public branch and staff profile payloads", () => {
    const branchResult = mapBranchPublicProfile(
      {
        id: 1,
        businessName: "Prime Salon",
        category: "SPA",
        description: null,
        logoUrl: null,
        city: "Cairo",
        district: "Nasr City",
        address: "12 Street",
        status: "APPROVED",
        plan: null,
        isSubscriptionActive: true,
        subscriptionStartedAt: new Date("2026-05-25T12:00:00.000Z"),
        averageRating: 4.8,
        reviewCount: 17,
        allowCancellationBeforeHours: 4,
        bookingNotificationsEnabled: true,
        marketingNotificationsEnabled: false,
        branchAvailabilities: [],
      },
      [],
    );

    const staffResult = mapStaffPublicProfile(
      {
        id: 7,
        profileImageUrl: null,
        staffRole: "BARBER",
        isActive: true,
        averageRating: 4.7,
        reviewCount: 34,
        user: { name: "Mazen Tamer" },
      },
      [],
    );

    expect(branchResult.branch).toMatchObject({
      businessName: "Prime Salon",
      currentSubscription: {
        isSubscriptionActive: true,
      },
    });
    expect(staffResult.staff).toMatchObject({
      name: "Mazen Tamer",
      isActive: true,
    });
  });
});