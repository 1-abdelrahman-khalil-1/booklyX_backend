import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/authenticate.js";
import activitiesRouter from "./activities/activities.routes.js";
import analyticsRouter from "./analytics/analytics.routes.js";
import branchesRouter from "./branches/branches.routes.js";
import paymentsRouter from "./payments/payments.routes.js";
import servicesRouter from "./services/services.routes.js";
import financialRouter from "./financial/financial.routes.js";

const adminRouter = Router();

/**
 * All routes in this router require authentication and super_admin role.
 */
adminRouter.use(authenticate, authorize(Role.super_admin));

adminRouter.use("/branches", branchesRouter);
adminRouter.use("/services", servicesRouter);
adminRouter.use("/analytics", analyticsRouter);
adminRouter.use("/analytics", activitiesRouter);
adminRouter.use("/payments", paymentsRouter);
adminRouter.use("/financial", financialRouter);

export default adminRouter;
