import prisma from "../../../lib/prisma.js";

const DISCOVERY_SEARCH_TYPES = {
  BRANCHES: "branches",
  SERVICES: "services",
};

function normalizeDiscoveryQuery(query) {
  return {
    lat: Number(query.lat),
    lng: Number(query.lng),
    category: query.category ?? null,
    serviceCategoryId: query.serviceCategoryId ? Number(query.serviceCategoryId) : null,
    search: query.search?.trim() || null,
    type: query.type ?? DISCOVERY_SEARCH_TYPES.BRANCHES,
  };
}

function formatBranch(branch) {
  return {
    id: branch.id,
    name: branch.name,
    rating: Number(branch.rating || 0),
    totalReviews: Number(branch.totalReviews || 0),
    profileImage: branch.profileImage,
    topServiceCategories: [branch.category],
    location: {
      lat: Number(branch.latitude),
      lng: Number(branch.longitude),
    },
    distance: Number((branch.distance / 1000).toFixed(2)),
  };
}

function formatService(service) {
  return {
    id: service.id,
    name: service.name,
    price: Number(service.price),
    durationMinutes: service.durationMinutes,
    imageUrl: service.imageUrl,
    branch: {
      id: service.branchId,
      name: service.branchName,
      category: service.category,
      rating: Number(service.rating || 0),
      totalReviews: Number(service.totalReviews || 0),
    },
    location: {
      lat: Number(service.latitude),
      lng: Number(service.longitude),
    },
    distance: Number((service.distance / 1000).toFixed(2)),
  };
}

export async function searchDiscovery(query) {
  const normalizedQuery = normalizeDiscoveryQuery(query);

  if (normalizedQuery.type === DISCOVERY_SEARCH_TYPES.SERVICES) {
    return searchServices(normalizedQuery);
  }

  return searchBranches(normalizedQuery);
}

export async function searchBranches(query) {
  const { lat, lng, category, serviceCategoryId, search } = normalizeDiscoveryQuery(query);

  const branches = await prisma.$queryRaw`
      SELECT id, businessName as name, category, description, logoUrl as profileImage, averageRating as rating, reviewCount as totalReviews, latitude, longitude,
             ST_Distance_Sphere(point(longitude, latitude), point(${lng}, ${lat})) as distance
      FROM BranchAdmin
      WHERE
        status = 'APPROVED'
        AND isSubscriptionActive = 1
        AND (${category} IS NULL OR category = ${category})
        AND (
          ${serviceCategoryId} IS NULL
          OR EXISTS (
            SELECT 1
            FROM Service s
            WHERE s.branchId = BranchAdmin.id
              AND s.status = 'APPROVED'
              AND s.serviceCategoryId = ${serviceCategoryId}
          )
        )
        AND (
          ${search} IS NULL
          OR LOWER(businessName) LIKE CONCAT('%', LOWER(${search}), '%')
          OR LOWER(description) LIKE CONCAT('%', LOWER(${search}), '%')
        )
      ORDER BY distance ASC, rating DESC
    `;

  const branchesArray = Array.isArray(branches) ? branches : [];
  return branchesArray.map(formatBranch);
}


export async function searchServices(query) {
  const { lat, lng, category, serviceCategoryId, search } = normalizeDiscoveryQuery(query);

  const services = await prisma.$queryRaw`
    SELECT
      s.id,
      s.name,
      s.price,
      s.durationMinutes,
      s.imageUrl,
      b.id AS branchId,
      b.businessName AS branchName,
      b.category,
      b.averageRating AS rating,
      b.reviewCount AS totalReviews,
      b.latitude,
      b.longitude,
      ST_Distance_Sphere(
        POINT(b.longitude, b.latitude),
        POINT(${lng}, ${lat})
      ) AS distance
    FROM Service s
    INNER JOIN BranchAdmin b
      ON b.id = s.branchId
    WHERE
      s.status = 'APPROVED'
      AND b.status = 'APPROVED'
      AND b.isSubscriptionActive = 1
      AND (${category} IS NULL OR b.category = ${category})
      AND (${serviceCategoryId} IS NULL OR s.serviceCategoryId = ${serviceCategoryId})
      AND (
        ${search} IS NULL
        OR LOWER(s.name) LIKE CONCAT('%', LOWER(${search}), '%')
        OR LOWER(b.businessName) LIKE CONCAT('%', LOWER(${search}), '%')
        OR LOWER(s.description) LIKE CONCAT('%', LOWER(${search}), '%')
      )
    ORDER BY distance ASC, rating DESC
  `;

  const servicesArray = Array.isArray(services) ? services : [];
  return servicesArray.map(formatService);
}
