import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { Role } from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import {
  ReviewsForbiddenError,
  ReviewsValidationError,
  listMyReviews,
  listReviews,
} from "../reviews.service.js";

describe("Reviews Service - listReviews", () => {
  let transactionSpy;
  let findManySpy;
  let countSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    if (!prisma.review) {
      prisma.review = {
        findMany: async () => [],
        count: async () => 0,
      };
    }
    transactionSpy = jest.spyOn(prisma, "$transaction");
    findManySpy = jest.spyOn(prisma.review, "findMany");
    countSpy = jest.spyOn(prisma.review, "count");
  });

  it("should throw ReviewsValidationError when query params are invalid", async () => {
    await expect(
      listReviews(
        { serviceId: "-1" },
        { sub: 1, role: Role.super_admin },
      ),
    ).rejects.toThrow(
      ReviewsValidationError,
    );
  });

  it("should throw ReviewsForbiddenError for unsupported role", async () => {
    await expect(
      listReviews(
        {},
        { sub: 1, role: Role.client },
      ),
    ).rejects.toThrow(ReviewsForbiddenError);
  });

  it("should return reviews with pagination metadata", async () => {
    const mockReviews = [
      {
        id: 1,
        rating: 5,
        comment: "Excellent",
        createdAt: new Date("2026-03-20T00:00:00.000Z"),
        reviewer: { id: 10, name: "Reviewer User", role: Role.staff },
        service: { id: 20, name: "Haircut" },
        staff: { id: 30, user: { id: 40, name: "Staff User" } },
      },
    ];

    findManySpy.mockResolvedValue(mockReviews);
    countSpy.mockResolvedValue(1);
    transactionSpy.mockImplementation((operations) => Promise.all(operations));

    const result = await listReviews(
      { serviceId: "20", page: "1", limit: "10" },
      { sub: 999, role: Role.super_admin },
    );

    expect(transactionSpy).toHaveBeenCalled();
    expect(findManySpy).toHaveBeenCalled();
    expect(countSpy).toHaveBeenCalled();
    expect(result.reviews).toEqual(mockReviews);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it("should return only current reviewer reviews for listMyReviews", async () => {
    const mockReviews = [
      {
        id: 2,
        rating: 4,
        comment: "Good",
        createdAt: new Date("2026-03-20T00:00:00.000Z"),
        reviewer: { id: 88, name: "Current User", role: Role.staff },
        service: { id: 20, name: "Haircut" },
        staff: { id: 30, user: { id: 40, name: "Staff User" } },
      },
    ];

    findManySpy.mockResolvedValue(mockReviews);
    countSpy.mockResolvedValue(1);
    transactionSpy.mockImplementation((operations) => Promise.all(operations));

    const result = await listMyReviews(
      { page: "1", limit: "10" },
      { sub: 88, role: Role.staff },
    );

    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ reviewerId: 88 }),
      }),
    );
    expect(result.reviews).toEqual(mockReviews);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });
});
