import { getValidOffersForService } from "../../branch_admin/offers/offers.service.js";

/**
 * Return the currently valid offers for a service, shaped for client UI consumption.
 * Re-uses the shared eligibility logic from the branch_admin offers service so
 * validity rules (isActive, date window, usageLimit) stay in one place.
 *
 * @param {number} serviceId
 * @returns {Promise<Array<{ id, title, discountType, discountValue, endDate }>>}
 */
export async function getServiceOffers(serviceId) {
  const offers = await getValidOffersForService(serviceId);

  return offers.map((o) => ({
    id: o.id,
    title: o.title,
    description: o.description,
    imageUrl: o.imageUrl,
    discountType: o.discountType,
    discountValue: o.discountValue,
    startDate: o.startDate,
    endDate: o.endDate,
    usageLimit: o.usageLimit,
    usedCount: o.usedCount,
  }));
}
