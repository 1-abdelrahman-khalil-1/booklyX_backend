import {
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from "@jest/globals";
import {
    BranchStatus,
    OfferDiscountType,
    ServiceApprovalStatus,
} from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import {
    OffersValidationError,
    calculateBestOfferForService,
    createOffer,
    incrementOfferUsedCount,
} from "../offers.service.js";

describe("Offers Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default branch admin mock: approved and subscription active with offers enabled
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue({
      id: 9,
      status: BranchStatus.APPROVED,
      isSubscriptionActive: true,
      plan: { offersEnabled: true },
    });
  });

  it("should create offer when all services are approved and belong to branch", async () => {
    const branchAdminUserId = 77;
    const body = {
      title: "Summer Promo",
      description: "Discount for April",
      discountType: OfferDiscountType.PERCENTAGE,
      discountValue: 25,
      startDate: "2026-04-01T00:00:00.000Z",
      endDate: "2026-04-30T23:59:59.000Z",
      serviceIds: [10, 11],
    };

    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue({
      id: 9,
      status: BranchStatus.APPROVED,
      isSubscriptionActive: true,
      plan: { offersEnabled: true },
    });

    jest.spyOn(prisma.service, "findMany").mockResolvedValue([{ id: 10 }, { id: 11 }]);

    jest.spyOn(prisma.offer, "create").mockResolvedValue({
      id: "offer-id",
      branchId: 9,
      title: body.title,
      description: body.description,
      discountType: body.discountType,
      discountValue: body.discountValue,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      isActive: true,
      usageLimit: null,
      usedCount: 0,
      createdAt: new Date("2026-04-21T00:00:00.000Z"),
      updatedAt: new Date("2026-04-21T00:00:00.000Z"),
      services: [
        { service: { id: 10, name: "Haircut", price: 100, status: ServiceApprovalStatus.APPROVED } },
        { service: { id: 11, name: "Spa", price: 200, status: ServiceApprovalStatus.APPROVED } },
      ],
    });

    const result = await createOffer(body, branchAdminUserId);

    expect(result.id).toBe("offer-id");
    expect(result.services).toHaveLength(2);
  });

  it("should throw when offer percentage is more than 100", async () => {
    await expect(
      createOffer(
        {
          title: "Invalid",
          discountType: OfferDiscountType.PERCENTAGE,
          discountValue: 120,
          startDate: "2026-04-01T00:00:00.000Z",
          endDate: "2026-04-30T23:59:59.000Z",
          serviceIds: [10],
        },
        1,
      ),
    ).rejects.toThrow(OffersValidationError);
  });

  it("should return best offer with highest saving", async () => {
    jest.spyOn(prisma.service, "findUnique").mockResolvedValue({
      id: 50,
      price: 200,
      status: ServiceApprovalStatus.APPROVED,
      branch: { status: BranchStatus.APPROVED, isSubscriptionActive: true },
    });

    jest.spyOn(prisma.offer, "findMany").mockResolvedValue([
      {
        id: "a",
        title: "10%",
        discountType: OfferDiscountType.PERCENTAGE,
        discountValue: 10,
        startDate: new Date("2026-04-01T00:00:00.000Z"),
        endDate: new Date("2026-04-30T23:59:59.000Z"),
        usageLimit: null,
        usedCount: 0,
      },
      {
        id: "b",
        title: "50 fixed",
        discountType: OfferDiscountType.FIXED,
        discountValue: 50,
        startDate: new Date("2026-04-01T00:00:00.000Z"),
        endDate: new Date("2026-04-30T23:59:59.000Z"),
        usageLimit: null,
        usedCount: 0,
      },
    ]);

    const result = await calculateBestOfferForService(50);

    expect(result.basePrice).toBe(200);
    expect(result.savingsAmount).toBe(50);
    expect(result.finalPrice).toBe(150);
    expect(result.appliedOffer.id).toBe("b");
  });

  it("should increment usage count for an offer inside a transaction", async () => {
    const mockTx = {
      offer: {
        update: jest.fn().mockResolvedValue({ id: "offer-id", usedCount: 2 }),
      },
    };

    await incrementOfferUsedCount("offer-id", mockTx);

    expect(mockTx.offer.update).toHaveBeenCalledWith({
      where: { id: "offer-id" },
      data: { usedCount: { increment: 1 } },
    });
  });
});
