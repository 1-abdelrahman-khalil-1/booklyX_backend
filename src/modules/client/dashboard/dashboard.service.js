import { BranchStatus, BusinessCategory } from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import { getClientByUserId } from "../helpers.js";

export async function getHomeDashboard(query, userId) {
  const lat = query.lat ? parseFloat(query.lat) : 30.0444;
  const lng = query.lng ? parseFloat(query.lng) : 31.2357;
  const radius = query.radius ? parseFloat(query.radius) : 40.0;
  const radiusMeters = radius * 1000;
  const categoryFilter = query.category || null;
  const client = await getClientByUserId(userId);
  // Active Offers Carousel (belonging to APPROVED visible branches)
  const offers = await prisma.offer.findMany({
    where: {
      isActive: true,
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
      claimedOffers: {
        none: {
          clientId: client.id,
        },
      },
      branch: {
        status: BranchStatus.APPROVED,
        isSubscriptionActive: true,
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      discountType: true,
      discountValue: true,
      imageUrl: true,
      branchId: true,
      branch: {
        select: {
          businessName: true,
        },
      },
    },
    take: 10,
  });

  // Business Categories List
  const categories = Object.values(BusinessCategory);

  // Nearby Highlighted Providers within 20km, sorted by distance
  const nearbyProviders = categoryFilter
    ? await prisma.$queryRaw`
        SELECT id, businessName as name, category, description, logoUrl as profileImage, averageRating as rating, reviewCount as totalReviews, latitude, longitude,
               ST_Distance_Sphere(point(longitude, latitude), point(${lng}, ${lat})) as distance
        FROM BranchAdmin
        WHERE status = 'APPROVED' AND isSubscriptionActive = 1 AND category = ${categoryFilter}
        HAVING distance <= ${radiusMeters}
        ORDER BY distance ASC
        LIMIT 10
      `
    : await prisma.$queryRaw`
        SELECT id, businessName as name, category, description, logoUrl as profileImage, averageRating as rating, reviewCount as totalReviews, latitude, longitude,
               ST_Distance_Sphere(point(longitude, latitude), point(${lng}, ${lat})) as distance
        FROM BranchAdmin
        WHERE status = 'APPROVED' AND isSubscriptionActive = 1
        HAVING distance <= ${radiusMeters}
        ORDER BY distance ASC
        LIMIT 10
      `;

  // Parse distance numeric floats and structure coordinates
  const providersArray = Array.isArray(nearbyProviders) ? nearbyProviders : [];
  const formattedProviders = providersArray.map((provider) => ({
    id: provider.id,
    name: provider.name,
    category: provider.category,
    description: provider.description,
    profileImage: provider.profileImage,
    rating: Number(provider.rating || 0),
    totalReviews: Number(provider.totalReviews || 0),
    location: {
      lat: Number(provider.latitude),
      lng: Number(provider.longitude),
    },
    distance: Number((provider.distance / 1000).toFixed(2)), // in km
  }));

  return {
    offers,
    categories,
    nearbyProviders: formattedProviders,
  };
}
