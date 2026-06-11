import { Router } from "express";
import {
  getPlatformAnalyticsHandler,
  getAnalyticsOverviewHandler,
  getRevenueChartHandler,
} from "./analytics.controller.js";

const analyticsRouter = Router();

analyticsRouter.get("/platform", getPlatformAnalyticsHandler);
analyticsRouter.get("/overview", getAnalyticsOverviewHandler);
analyticsRouter.get("/revenue-chart", getRevenueChartHandler);

export default analyticsRouter;
