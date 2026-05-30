import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import {
    getBranchDashboardStatsHandler,
    getRecentBookingsHandler,
    getRecentTransactionsHandler,
    getRevenueChartDataHandler,
    getStaffEarningsHandler,
    getTopServicesHandler,
} from "./analytics.controller.js";

const analyticsRouter = Router();

analyticsRouter.get("/dashboard", authenticate, authorize(Role.branch_admin), getBranchDashboardStatsHandler);
analyticsRouter.get("/staff-earnings", authenticate, authorize(Role.branch_admin), getStaffEarningsHandler);
analyticsRouter.get("/revenue-chart", authenticate, authorize(Role.branch_admin), getRevenueChartDataHandler);
analyticsRouter.get("/recent-bookings", authenticate, authorize(Role.branch_admin), getRecentBookingsHandler);
analyticsRouter.get("/top-services", authenticate, authorize(Role.branch_admin), getTopServicesHandler);
analyticsRouter.get(
  "/recent-transactions",
  authenticate,
  authorize(Role.branch_admin),
  getRecentTransactionsHandler,
);

export default analyticsRouter;