import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import {
    cancelAppointmentHandler,
    getAppointmentDetailsHandler,
    listAppointmentsHandler,
} from "./appointments.controller.js";

const appointmentsRouter = Router();

appointmentsRouter.get("/", authenticate, authorize(Role.branch_admin), listAppointmentsHandler);
appointmentsRouter.get("/:id", authenticate, authorize(Role.branch_admin), getAppointmentDetailsHandler);
appointmentsRouter.patch(
  "/:id/cancel",
  authenticate,
  authorize(Role.branch_admin),
  cancelAppointmentHandler,
);

export default appointmentsRouter;