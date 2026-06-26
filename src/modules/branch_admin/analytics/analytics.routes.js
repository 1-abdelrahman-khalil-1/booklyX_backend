import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { requireActiveBranchSubscription } from "../../../middleware/branchAdminSubscription.js";
import {
    getBranchDashboardStatsHandler,
    getRecentBookingsHandler,
    getRecentTransactionsHandler,
    getRevenueChartDataHandler,
    getStaffEarningsHandler,
    getTopServicesHandler,
} from "./analytics.controller.js";

const analyticsRouter = Router();

analyticsRouter.use(authenticate, authorize(Role.branch_admin), requireActiveBranchSubscription);

analyticsRouter.get("/dashboard", getBranchDashboardStatsHandler);
analyticsRouter.get("/staff-earnings", getStaffEarningsHandler);
analyticsRouter.get("/revenue-chart", getRevenueChartDataHandler);
analyticsRouter.get("/recent-bookings", getRecentBookingsHandler);
analyticsRouter.get("/top-services", getTopServicesHandler);
analyticsRouter.get("/recent-transactions", getRecentTransactionsHandler);

export default analyticsRouter;