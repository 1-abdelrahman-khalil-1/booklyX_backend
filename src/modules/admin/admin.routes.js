import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/authenticate.js";
import {
    approveBranchHandler,
    approveServiceHandler,
    getBranchDetailsHandler,
    getBranchPaymentDetailsHandler,
    getPlatformAnalyticsHandler,
    getRecentActivitiesHandler,
    getServiceDetailsHandler,
    listBranchPaymentsHandler,
    listBranchesHandler,
    listServicesHandler,
    refundBranchPaymentHandler,
    rejectBranchHandler,
    rejectServiceHandler
} from "./admin.controller.js";

const adminRouter = Router();

/**
 * All routes in this router require authentication and super_admin role.
 */
adminRouter.use(authenticate, authorize(Role.super_admin));

adminRouter.get("/branches", listBranchesHandler);

adminRouter.get("/branches/:id", getBranchDetailsHandler);

adminRouter.patch("/branches/:id/approve", approveBranchHandler);

adminRouter.patch("/branches/:id/reject", rejectBranchHandler);

adminRouter.get("/services", listServicesHandler);

adminRouter.get("/services/:id", getServiceDetailsHandler);

adminRouter.patch("/services/:id/approve", approveServiceHandler);

adminRouter.patch("/services/:id/reject", rejectServiceHandler);

adminRouter.get("/analytics/platform", getPlatformAnalyticsHandler);

adminRouter.get("/analytics/recent-activities", getRecentActivitiesHandler);

adminRouter.get("/payments", listBranchPaymentsHandler);

adminRouter.get("/payments/:paymentId", getBranchPaymentDetailsHandler);

adminRouter.post("/payments/:paymentId/refund", refundBranchPaymentHandler);


export default adminRouter;
