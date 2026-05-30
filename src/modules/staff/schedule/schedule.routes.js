import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { getScheduleHandler } from "./schedule.controller.js";

const scheduleRouter = Router();
scheduleRouter.use(authenticate, authorize(Role.staff));

scheduleRouter.get("/schedule", getScheduleHandler);

export default scheduleRouter;
