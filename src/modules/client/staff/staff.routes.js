import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import {
  getServiceStaffHandler,
  getStaffProfileHandler,
  getStaffAvailableDaysHandler,
  getStaffAvailableSlotsHandler,
} from "./staff.controller.js";

const staffRouter = Router();
staffRouter.use(authenticate, authorize(Role.client));

staffRouter.get("/services/:id/staff", getServiceStaffHandler);
staffRouter.get("/staff/:id/profile", getStaffProfileHandler);
staffRouter.get("/staff/:id/availability/days", getStaffAvailableDaysHandler);
staffRouter.get("/staff/:id/availability/slots", getStaffAvailableSlotsHandler);

export default staffRouter;
