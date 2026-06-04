import { Router } from "express";
import { getPlatformAnalyticsHandler } from "./analytics.controller.js";

const analyticsRouter = Router();

analyticsRouter.get("/platform", getPlatformAnalyticsHandler);

export default analyticsRouter;
