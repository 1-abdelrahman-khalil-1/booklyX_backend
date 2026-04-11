import { Role } from "../../generated/prisma/client.js";
import { tr } from "../../lib/i18n/index.js";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import {
  listReviewsQuerySchema,
  validateReviewsInput,
} from "./reviews.validation.js";

export class ReviewsValidationError extends AppError {
  constructor(message, params) {
    super(message, 400, params);
    this.name = "ReviewsValidationError";
  }
}

export class ReviewsForbiddenError extends AppError {
  constructor() {
    super(tr.FORBIDDEN, 403);
    this.name = "ReviewsForbiddenError";
  }
}

function buildReviewsSelect() {
  return {
    id: true,
    rating: true,
    comment: true,
    createdAt: true,
    reviewer: {
      select: {
        id: true,
        name: true,
        role: true,
      },
    },
    service: {
      select: {
        id: true,
        name: true,
      },
    },
    staff: {
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
  };
}

export async function listReviews(query, authUser) {
  const data = validateReviewsInput(listReviewsQuerySchema, query);

  const skip = (data.page - 1) * data.limit;
  const scopedWhere = {
    [Role.staff]: {
      staff: {
        userId: authUser.sub,
      },
    },
    [Role.branch_admin]: {
      service: {
        branch: {
          userId: authUser.sub,
        },
      },
    },
    [Role.super_admin]: {},
  };

  if (!(authUser.role in scopedWhere)) {
    throw new ReviewsForbiddenError();
  }

  const where = {
    ...scopedWhere[authUser.role],
    ...(data.serviceId ? { serviceId: data.serviceId } : {}),
    ...(data.staffId ? { staffId: data.staffId } : {}),
  };

  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      skip,
      take: data.limit,
      orderBy: { createdAt: "desc" },
      select: buildReviewsSelect(),
    }),
    prisma.review.count({ where }),
  ]);

  return {
    message: tr.REVIEWS_FETCHED_SUCCESSFULLY,
    reviews,
    pagination: {
      page: data.page,
      limit: data.limit,
      total,
      totalPages: Math.ceil(total / data.limit),
    },
  };
}

export async function listMyReviews(query, authUser) {
  const data = validateReviewsInput(listReviewsQuerySchema, query);
  const skip = (data.page - 1) * data.limit;

  const where = {
    reviewerId: authUser.sub,
    ...(data.serviceId ? { serviceId: data.serviceId } : {}),
    ...(data.staffId ? { staffId: data.staffId } : {}),
  };

  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      skip,
      take: data.limit,
      orderBy: { createdAt: "desc" },
      select: buildReviewsSelect(),
    }),
    prisma.review.count({ where }),
  ]);

  return {
    message: tr.MY_REVIEWS_FETCHED_SUCCESSFULLY,
    reviews,
    pagination: {
      page: data.page,
      limit: data.limit,
      total,
      totalPages: Math.ceil(total / data.limit),
    },
  };
}
