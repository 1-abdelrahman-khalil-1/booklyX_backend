import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/authenticate.js";
import {
  acceptAppointmentHandler,
  addServiceHandler,
  completeAppointmentHandler,
  createAvailabilityHandler,
  deleteAvailabilityHandler,
  getAppointmentsHandler,
  getAvailableSlotsHandler,
  getIncomeStatsHandler,
  getProfileHandler,
  getScheduleHandler,
  listAvailabilityHandler,
  listServicesHandler,
  rejectAppointmentHandler,
  startAppointmentHandler,
  updateAvailabilityHandler,
} from "./staff.controller.js";

const staffRouter = Router();

// ─── Profile ───────────────────────────────────────────────────────────
staffRouter.get(
  "/profile",
  authenticate,
  authorize(Role.staff),
  getProfileHandler,
);

// ─── Schedule ──────────────────────────────────────────────────────────
staffRouter.get(
  "/schedule",
  authenticate,
  authorize(Role.staff),
  getScheduleHandler,
);

// ─── Appointments ──────────────────────────────────────────────────────────
staffRouter.get(
  "/appointments",
  authenticate,
  authorize(Role.staff),
  getAppointmentsHandler,
);

// ─── Appointments ─────────────────────────────────────────────────────
staffRouter.patch(
  "/appointments/:appointmentId/accept",
  authenticate,
  authorize(Role.staff),
  acceptAppointmentHandler,
);

staffRouter.patch(
  "/appointments/:appointmentId/reject",
  authenticate,
  authorize(Role.staff),
  rejectAppointmentHandler,
);

staffRouter.patch(
  "/appointments/:appointmentId/start",
  authenticate,
  authorize(Role.staff),
  startAppointmentHandler,
);

staffRouter.patch(
  "/appointments/:appointmentId/complete",
  authenticate,
  authorize(Role.staff),
  completeAppointmentHandler,
);

// ─── Income ───────────────────────────────────────────────────────────
staffRouter.get(
  "/income",
  authenticate,
  authorize(Role.staff),
  getIncomeStatsHandler,
);

// ─── Services ──────────────────────────────────────────────────────────
staffRouter.get(
  "/services",
  authenticate,
  authorize(Role.staff),
  listServicesHandler,
);

staffRouter.post(
  "/services",
  authenticate,
  authorize(Role.staff),
  addServiceHandler,
);

// ─── Availability ─────────────────────────────────────────────────────
staffRouter.get(
  "/availability",
  authenticate,
  authorize(Role.staff),
  listAvailabilityHandler,
);

staffRouter.post(
  "/availability",
  authenticate,
  authorize(Role.staff),
  createAvailabilityHandler,
);

staffRouter.put(
  "/availability/:availabilityId",
  authenticate,
  authorize(Role.staff),
  updateAvailabilityHandler,
);

staffRouter.delete(
  "/availability/:availabilityId",
  authenticate,
  authorize(Role.staff),
  deleteAvailabilityHandler,
);

// ─── Available Slots ──────────────────────────────────────────────────
staffRouter.get(
  "/available-slots",
  authenticate,
  authorize(Role.staff),
  getAvailableSlotsHandler,
);

export default staffRouter;
