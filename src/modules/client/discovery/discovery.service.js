import prisma from "../../../lib/prisma.js";

export async function searchBranches(query) {
  const lat = parseFloat(query.lat);
  const lng = parseFloat(query.lng);
  const category = query.category;
  const search = query.search;

  // Search branches utilizing spatial distance calculations (ST_Distance_Sphere)
  // Filter by category and search text. Strictly sorted by less distance first, then high rating.
  let branches;
  if (category && search) {
    branches = await prisma.$queryRaw`
      SELECT id, businessName as name, category, description, logoUrl as profileImage, averageRating as rating, reviewCount as totalReviews, latitude, longitude,
             ST_Distance_Sphere(point(longitude, latitude), point(${lng}, ${lat})) as distance
      FROM BranchAdmin
      WHERE status = 'APPROVED' AND isSubscriptionActive = 1 AND category = ${category} AND businessName LIKE CONCAT('%', ${search}, '%')
      ORDER BY distance ASC, rating DESC
    `;
  } else if (category && !search) {
    branches = await prisma.$queryRaw`
      SELECT id, businessName as name, category, description, logoUrl as profileImage, averageRating as rating, reviewCount as totalReviews, latitude, longitude,
             ST_Distance_Sphere(point(longitude, latitude), point(${lng}, ${lat})) as distance
      FROM BranchAdmin
      WHERE status = 'APPROVED' AND isSubscriptionActive = 1 AND category = ${category}
      ORDER BY distance ASC, rating DESC
    `;
  } else if (!category && search) {
    branches = await prisma.$queryRaw`
      SELECT id, businessName as name, category, description, logoUrl as profileImage, averageRating as rating, reviewCount as totalReviews, latitude, longitude,
             ST_Distance_Sphere(point(longitude, latitude), point(${lng}, ${lat})) as distance
      FROM BranchAdmin
      WHERE status = 'APPROVED' AND isSubscriptionActive = 1 AND businessName LIKE CONCAT('%', ${search}, '%')
      ORDER BY distance ASC, rating DESC
    `;
  } else {
    branches = await prisma.$queryRaw`
      SELECT id, businessName as name, category, description, logoUrl as profileImage, averageRating as rating, reviewCount as totalReviews, latitude, longitude,
             ST_Distance_Sphere(point(longitude, latitude), point(${lng}, ${lat})) as distance
      FROM BranchAdmin
      WHERE status = 'APPROVED' AND isSubscriptionActive = 1
      ORDER BY distance ASC, rating DESC
    `;
  }

  const branchesArray = Array.isArray(branches) ? branches : [];
  const formattedBranches = branchesArray.map((b) => ({
    id: b.id,
    name: b.name,
    rating: Number(b.rating || 0),
    totalReviews: Number(b.totalReviews || 0),
    profileImage: b.profileImage,
    topServiceCategories: [b.category],
    location: {
      lat: Number(b.latitude),
      lng: Number(b.longitude),
    },
    distance: Number((b.distance / 1000).toFixed(2)),
  }));

  return formattedBranches;
}
