import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import {
  getAppointmentsHandler,
  getAppointmentsDetailsHandler,
  startAppointmentHandler,
  completeAppointmentHandler,
} from "./appointments.controller.js";

const appointmentsRouter = Router();
appointmentsRouter.use(authenticate, authorize(Role.staff));

appointmentsRouter.get("/appointments", getAppointmentsHandler);
appointmentsRouter.get("/appointments/:id", getAppointmentsDetailsHandler);
appointmentsRouter.patch("/appointments/:appointmentId/start", startAppointmentHandler);
appointmentsRouter.patch("/appointments/:appointmentId/complete", completeAppointmentHandler);

export default appointmentsRouter;
