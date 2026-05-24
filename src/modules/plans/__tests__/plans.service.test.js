import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import prisma from "../../../lib/prisma.js";
import { listPlans } from "../plans.service.js";

describe("Plans Service - listPlans", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return active lightweight plans ordered by price ascending", async () => {
    const mockPlans = [
      {
        id: 1,
        name: "Starter",
        price: "199.00",
        maxStaff: 3,
        maxServices: 10,
        loyaltyEnabled: false,
        offersEnabled: false,
      },
      {
        id: 2,
        name: "Pro",
        price: "499.00",
        maxStaff: 15,
        maxServices: 50,
        loyaltyEnabled: true,
        offersEnabled: true,
      },
    ];

    const findManySpy = jest.spyOn(prisma.plan, "findMany").mockResolvedValue(mockPlans);

    const result = await listPlans();

    expect(findManySpy).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { price: "asc" },
      select: {
        id: true,
        name: true,
        price: true,
        maxStaff: true,
        maxServices: true,
        loyaltyEnabled: true,
        offersEnabled: true,
      },
    });
    expect(result).toEqual(mockPlans);
  });
});
