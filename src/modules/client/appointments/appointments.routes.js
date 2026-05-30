import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import {
  reserveAppointmentHandler,
  confirmAppointmentPaymentHandler,
  getClientAppointmentsHandler,
  getAppointmentDetailsHandler,
  cancelAppointmentHandler,
} from "./appointments.controller.js";

const appointmentsRouter = Router();
appointmentsRouter.use(authenticate, authorize(Role.client));

appointmentsRouter.post("/appointments/reserve", reserveAppointmentHandler);
appointmentsRouter.post("/appointments/:id/confirm-payment", confirmAppointmentPaymentHandler);
appointmentsRouter.get("/appointments", getClientAppointmentsHandler);
appointmentsRouter.get("/appointments/:id", getAppointmentDetailsHandler);
appointmentsRouter.post("/appointments/:id/cancel", cancelAppointmentHandler);

export default appointmentsRouter;
