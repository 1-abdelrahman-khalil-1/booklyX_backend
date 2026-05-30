import dayjs from "dayjs";
import { prisma } from "../helpers/prisma.js";
import { OFFER_TARGETS } from "../config/constants.js";
import { pickRandom } from "../helpers/random.js";
import { OfferDiscountType } from "../../src/generated/prisma/client.js";
import { ASSETS } from "../config/assets.js";

export async function seedOffers(seededBranchAdmins, serviceLookup) {
  for (const { branchAdmin, branchSubmission } of seededBranchAdmins) {
    const branchServices = serviceLookup.find(
      (entry) => entry.branchId === branchAdmin.id,
    );

    if (!branchServices?.approvedServiceId) {
      continue;
    }

    const approvedService = await prisma.service.findUnique({
      where: { id: branchServices.approvedServiceId },
    });

    const pendingServiceId = branchServices.pendingServiceId ?? branchServices.approvedServiceId;
    const pendingService = await prisma.service.findUnique({
      where: { id: pendingServiceId },
    });

    if (!approvedService) {
      continue;
    }

    await prisma.offer.deleteMany({
      where: { branchId: branchAdmin.id },
    });

    const category = branchSubmission.category || "SPA";
    const categoryLower = category.toLowerCase();
    const imageKey = categoryLower === "clinic" ? "medical" : categoryLower;
    const offerImages = ASSETS.offerImages[imageKey] || ASSETS.offerImages.spa;

    const offerTargets = [
      {
        title: category === "BARBER" 
          ? `Grooming Launch: ${OFFER_TARGETS[0].discountValue}% Off ${approvedService.name}`
          : category === "CLINIC"
            ? `Special Launch: ${OFFER_TARGETS[0].discountValue}% Off ${approvedService.name}`
            : `Wellness Deal: ${OFFER_TARGETS[0].discountValue}% Off ${approvedService.name}`,
        description: `Experience the best of our services with a special ${OFFER_TARGETS[0].discountValue}% discount on ${approvedService.name}.`,
        discountType: OfferDiscountType.PERCENTAGE,
        discountValue: OFFER_TARGETS[0].discountValue,
        serviceId: branchServices.approvedServiceId,
        imageUrl: offerImages[0 % offerImages.length],
      },
      {
        title: category === "BARBER" 
          ? `Save EGP ${OFFER_TARGETS[1].discountValue} on ${pendingService.name}`
          : category === "CLINIC"
            ? `Consultation Offer: Save EGP ${OFFER_TARGETS[1].discountValue} on ${pendingService.name}`
            : `Relaxation Special: Save EGP ${OFFER_TARGETS[1].discountValue} on ${pendingService.name}`,
        description: `Get EGP ${OFFER_TARGETS[1].discountValue} off on ${pendingService.name} for a limited time.`,
        discountType: OfferDiscountType.FIXED,
        discountValue: OFFER_TARGETS[1].discountValue,
        serviceId: pendingServiceId,
        imageUrl: offerImages[1 % offerImages.length],
      },
    ].filter((offer) => offer.serviceId);

    for (const offerTarget of offerTargets) {
      const offer = await prisma.offer.create({
        data: {
          branchId: branchAdmin.id,
          title: offerTarget.title,
          description: offerTarget.description,
          discountType: offerTarget.discountType,
          discountValue: offerTarget.discountValue,
          startDate: dayjs().subtract(1, "day").toDate(),
          endDate: dayjs().add(30, "day").toDate(),
          imageUrl: offerTarget.imageUrl,
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
