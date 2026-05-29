import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/authenticate.js";
import { createReviewHandler, listMyReviewsHandler, listReviewsHandler } from "./reviews.controller.js";

const reviewsRouter = Router();

reviewsRouter.get(
	"/my",
	authenticate,
	authorize(Role.branch_admin, Role.staff, Role.super_admin, Role.client),
	listMyReviewsHandler,
);

reviewsRouter.post(
  "/",
  authenticate,
  authorize(Role.client),
  createReviewHandler,
);

reviewsRouter.get(
	"/",
	authenticate,
	authorize(Role.branch_admin, Role.staff, Role.super_admin, Role.client),
	listReviewsHandler,
);

export default reviewsRouter;
