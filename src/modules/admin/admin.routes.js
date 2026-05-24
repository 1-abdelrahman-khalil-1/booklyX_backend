import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/authenticate.js";
import {
    approveBranchHandler,
    approveServiceHandler,
    getBranchDetailsHandler,
    getBranchPaymentDetailsHandler,
    getPlatformAnalyticsHandler,
    getServiceDetailsHandler,
    getUserProfileHandler,
    listBranchPaymentsHandler,
    listBranchesHandler,
    listServicesHandler,
    rejectBranchHandler,
    rejectServiceHandler,
} from "./admin.controller.js";

const adminRouter = Router();

/**
 * All routes in this router require authentication and super_admin role.
 */
adminRouter.use(authenticate, authorize(Role.super_admin));

adminRouter.get("/branches", listBranchesHandler);

adminRouter.get("/users/:id", getUserProfileHandler);

adminRouter.get("/branches/:id", getBranchDetailsHandler);

adminRouter.post("/branches/:id/approve", approveBranchHandler);

adminRouter.post("/branches/:id/reject", rejectBranchHandler);

adminRouter.get("/services", listServicesHandler);

adminRouter.get("/services/:id", getServiceDetailsHandler);

adminRouter.post("/services/:id/approve", approveServiceHandler);

adminRouter.post("/services/:id/reject", rejectServiceHandler);

adminRouter.get("/analytics/platform", getPlatformAnalyticsHandler);

adminRouter.get("/payments", listBranchPaymentsHandler);

adminRouter.get("/payments/:paymentId", getBranchPaymentDetailsHandler);

export default adminRouter;
