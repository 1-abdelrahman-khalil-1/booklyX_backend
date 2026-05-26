import dayjs from "dayjs";
import { prisma } from "../helpers/prisma.js";
import { OFFER_TARGETS } from "../config/constants.js";
import { pickRandom } from "../helpers/random.js";
import { OfferDiscountType } from "../../src/generated/prisma/client.js";
import { ASSETS } from "../config/assets.js";

export async function seedOffers(seededBranchAdmins, serviceLookup) {
  for (const { branchAdmin } of seededBranchAdmins) {
    const branchServices = serviceLookup.find(
      (entry) => entry.branchId === branchAdmin.id,
    );

    if (!branchServices?.approvedServiceId) {
      continue;
    }

    await prisma.offer.deleteMany({
      where: { branchId: branchAdmin.id },
    });

    const offerTargets = [
      {
        title: `Launch Percentage ${branchAdmin.id}`,
        discountType: OfferDiscountType.PERCENTAGE,
        discountValue: OFFER_TARGETS[0].discountValue,
        serviceId: branchServices.approvedServiceId,
      },
      {
        title: `Launch Fixed ${branchAdmin.id}`,
        discountType: OfferDiscountType.FIXED,
        discountValue: OFFER_TARGETS[1].discountValue,
        serviceId: branchServices.pendingServiceId ?? branchServices.approvedServiceId,
      },
    ].filter((offer) => offer.serviceId);

    for (const offerTarget of offerTargets) {
      const offer = await prisma.offer.create({
        data: {
          branchId: branchAdmin.id,
          title: offerTarget.title,
          description: `Seeded ${offerTarget.discountType.toLowerCase()} offer for branch coverage.`,
          discountType: offerTarget.discountType,
          discountValue: offerTarget.discountValue,
          startDate: dayjs().subtract(1, "day").toDate(),
          endDate: dayjs().add(30, "day").toDate(),
          imageUrl: pickRandom(ASSETS.offerImages, branchAdmin.id),
          isActive: true,
          usageLimit: 50,
          usedCount: 0,
        },
      });

      await prisma.offerService.create({
        data: {
          offerId: offer.id,
          serviceId: offerTarget.serviceId,
        },
      });
    }
  }
}
