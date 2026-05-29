import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/authenticate.js";
import {
  addFavoriteBranchHandler,
  addFavoriteStaffHandler,
  cancelAppointmentHandler,
  confirmAppointmentPaymentHandler,
  getAppointmentDetailsHandler,
  getBranchProfileHandler,
  getBranchServicesHandler,
  getClientAppointmentsHandler,
  getClientFavouritesHandler,
  getHomeDashboardHandler,
  getServiceStaffHandler,
  getStaffAvailableDaysHandler,
  getStaffAvailableSlotsHandler,
  getStaffProfileHandler,
  removeFavoriteBranchHandler,
  removeFavoriteStaffHandler,
  reserveAppointmentHandler,
  searchBranchesHandler,
} from "./client.controller.js";

const clientRouter = Router();

// Apply auth for all client features
clientRouter.use(authenticate, authorize(Role.client));

// 1. Home Dashboard Feeds
clientRouter.get("/home/dashboard", getHomeDashboardHandler);

// 2. Discovery & Map Search
clientRouter.get("/discovery/search", searchBranchesHandler);

// 3. Branch Profile
clientRouter.get("/branches/:id/profile", getBranchProfileHandler);

// 4. Branch Services
clientRouter.get("/branches/:id/services", getBranchServicesHandler);

// 5. Service Staff
clientRouter.get("/services/:id/staff", getServiceStaffHandler);

// 6. Staff Profile
clientRouter.get("/staff/:id/profile", getStaffProfileHandler);

// 7. Staff Availability Days
clientRouter.get("/staff/:id/availability/days", getStaffAvailableDaysHandler);

// 8. Staff Availability Slots
clientRouter.get("/staff/:id/availability/slots", getStaffAvailableSlotsHandler);

// 9. Appointment Booking: Reserve
clientRouter.post("/appointments/reserve", reserveAppointmentHandler);

// 10. Appointment Booking: Confirm Payment
clientRouter.post("/appointments/:id/confirm-payment", confirmAppointmentPaymentHandler);

// 11. List Client Appointments
clientRouter.get("/appointments", getClientAppointmentsHandler);

// 12. Client Appointment Details
clientRouter.get("/appointments/:id", getAppointmentDetailsHandler);

// 13. Cancel Client Appointment
clientRouter.post("/appointments/:id/cancel", cancelAppointmentHandler);

// 14. Favorites Management: Branches
clientRouter.post("/favourites/branches/:id", addFavoriteBranchHandler);
clientRouter.delete("/favourites/branches/:id", removeFavoriteBranchHandler);

// 15. Favorites Management: Staff
clientRouter.post("/favourites/staff/:id", addFavoriteStaffHandler);
clientRouter.delete("/favourites/staff/:id", removeFavoriteStaffHandler);

// 16. List Favorites
clientRouter.get("/favourites", getClientFavouritesHandler);

export default clientRouter;
