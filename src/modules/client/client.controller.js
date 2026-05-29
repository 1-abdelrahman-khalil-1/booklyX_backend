import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { zId, zIdParamSchema } from "../../lib/validation/primitives.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import { z } from "zod";
import {
  addFavoriteBranch,
  addFavoriteStaff,
  cancelAppointment,
  confirmAppointmentPayment,
  getAppointmentDetails,
  getBranchProfile,
  getBranchServices,
  getClientAppointments,
  getClientFavourites,
  getHomeDashboard,
  getServiceStaff,
  getStaffAvailableDays,
  getStaffAvailableSlots,
  getStaffProfile,
  removeFavoriteBranch,
  removeFavoriteStaff,
  reserveAppointment,
  searchBranches,
} from "./client.service.js";
import {
  availabilitySlotsSchema,
  discoverySearchSchema,
  favouritesQuerySchema,
  homeDashboardQuerySchema,
  reserveAppointmentSchema,
  validateClientInput,
} from "./client.validation.js";

export const getHomeDashboardHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const query = validateClientInput(homeDashboardQuerySchema, req.query);
  const result = await getHomeDashboard(query, req.user);
  successResponse(res, 200, t(tr.DASHBOARD_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const searchBranchesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const query = validateClientInput(discoverySearchSchema, req.query);
  const result = await searchBranches(query);
  successResponse(res, 200, t(tr.SEARCH_COMPLETED_SUCCESSFULLY, lang), result);
});

// 3. Fetch Branch Public Profile
export const getBranchProfileHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const result = await getBranchProfile(id);
  successResponse(res, 200, t(tr.BRANCH_PROFILE_RETRIEVED_SUCCESSFULLY, lang), result);
});

// 4. List Branch Services
export const getBranchServicesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const result = await getBranchServices(id);
  successResponse(res, 200, t(tr.BRANCH_SERVICES_RETRIEVED, lang), result);
});

// 5. List Staff by Service
export const getServiceStaffHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const result = await getServiceStaff(id);
  successResponse(res, 200, t(tr.STAFF_RETRIEVED_SUCCESSFULLY, lang), result);
});

// 6. Get Staff Public Profile
export const getStaffProfileHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const result = await getStaffProfile(id);
  successResponse(res, 200, t(tr.PROFILE_RETRIEVED_SUCCESSFULLY, lang), result);
});

// 7. Calculate Available Days for Staff
export const getStaffAvailableDaysHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const query = validateClientInput(
    z.object({ serviceId: zId }),
    req.query
  );
  const result = await getStaffAvailableDays(id, query.serviceId);
  successResponse(res, 200, t(tr.STAFF_AVAILABILITY_RETRIEVED, lang), result);
});

// 8. Calculate Available Time Slots for Staff on Date
export const getStaffAvailableSlotsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const query = validateClientInput(
    z.object({
      serviceId: zId,
      date: z.string(),
    }),
    req.query
  );
  const result = await getStaffAvailableSlots(id, query.serviceId, query.date);
  successResponse(res, 200, t(tr.SLOTS_RETRIEVED_SUCCESSFULLY, lang), result);
});

// 9. Appointment Booking: Reserve Slot (PENDING)
export const reserveAppointmentHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateClientInput(reserveAppointmentSchema, req.body);
  const result = await reserveAppointment(data, req.user);
  successResponse(res, 201, t(tr.APPOINTMENT_RESERVED_SUCCESSFULLY, lang), result);
});

// 10. Process Fake Payment and Confirm Booking
export const confirmAppointmentPaymentHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const body = validateClientInput(
    z.object({ success: z.boolean() }),
    req.body
  );
  const result = await confirmAppointmentPayment(id, body, req.user);
  successResponse(res, 200, t(result.message, lang), {
    appointment: result.appointment,
    payment: result.payment,
  });
});

// 11. List Appointments (Historical and Upcoming)
export const getClientAppointmentsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await getClientAppointments(req.user);
  successResponse(res, 200, t(tr.APPOINTMENTS_RETRIEVED_SUCCESSFULLY, lang), result);
});

// 12. Fetch Booking Details
export const getAppointmentDetailsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const result = await getAppointmentDetails(id, req.user);
  successResponse(res, 200, t(tr.APPOINTMENT_DETAILS_RETRIEVED_SUCCESSFULLY, lang), result);
});

// 13. Cancel Appointment
export const cancelAppointmentHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const result = await cancelAppointment(id, req.user);
  successResponse(res, 200, t(result.message, lang), {
    appointment: result.appointment,
    payment: result.payment,
  });
});

// 14. Favorites Management: Add Favorite Branch
export const addFavoriteBranchHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const result = await addFavoriteBranch(id, req.user);
  successResponse(res, 201, t(tr.FAVOURITE_ADDED_SUCCESSFULLY, lang), result);
});

// 15. Favorites Management: Remove Favorite Branch
export const removeFavoriteBranchHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const result = await removeFavoriteBranch(id, req.user);
  successResponse(res, 200, t(tr.FAVOURITE_REMOVED_SUCCESSFULLY, lang), result);
});

// 16. Favorites Management: Add Favorite Staff
export const addFavoriteStaffHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const result = await addFavoriteStaff(id, req.user);
  successResponse(res, 201, t(tr.FAVOURITE_ADDED_SUCCESSFULLY, lang), result);
});

// 17. Favorites Management: Remove Favorite Staff
export const removeFavoriteStaffHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const result = await removeFavoriteStaff(id, req.user);
  successResponse(res, 200, t(tr.FAVOURITE_REMOVED_SUCCESSFULLY, lang), result);
});

// 18. Favourites List
export const getClientFavouritesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const query = validateClientInput(favouritesQuerySchema, req.query);
  const result = await getClientFavourites(query, req.user);
  successResponse(res, 200, t(tr.FAVOURITES_RETRIEVED_SUCCESSFULLY, lang), result);
});
