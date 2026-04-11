import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/authenticate.js";
import { listMyReviewsHandler, listReviewsHandler } from "./reviews.controller.js";

const reviewsRouter = Router();

reviewsRouter.get(
	"/my",
	authenticate,
	authorize(Role.branch_admin, Role.staff, Role.super_admin),
	listMyReviewsHandler,
);

reviewsRouter.get(
	"/",
	authenticate,
	authorize(Role.branch_admin, Role.staff, Role.super_admin),
	listReviewsHandler,
);

export default reviewsRouter;
