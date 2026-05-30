import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import {
  listAvailabilityHandler,
  createAvailabilityHandler,
  updateAvailabilityHandler,
  deleteAvailabilityHandler,
  getAvailableSlotsHandler,
} from "./availability.controller.js";

const availabilityRouter = Router();
availabilityRouter.use(authenticate, authorize(Role.staff));

availabilityRouter.get("/availability", listAvailabilityHandler);
availabilityRouter.post("/availability", createAvailabilityHandler);
availabilityRouter.put("/availability/:availabilityId", updateAvailabilityHandler);
availabilityRouter.delete("/availability/:availabilityId", deleteAvailabilityHandler);
availabilityRouter.get("/available-slots", getAvailableSlotsHandler);

export default availabilityRouter;
