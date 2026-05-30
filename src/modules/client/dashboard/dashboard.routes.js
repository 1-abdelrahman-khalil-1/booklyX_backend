import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { getHomeDashboardHandler } from "./dashboard.controller.js";

const dashboardRouter = Router();
dashboardRouter.use(authenticate, authorize(Role.client));

dashboardRouter.get("/home/dashboard", getHomeDashboardHandler);

export default dashboardRouter;
