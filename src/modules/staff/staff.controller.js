import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import {
  acceptAppointment,
  addStaffService,
  completeAppointment,
  createStaffAvailability,
  deleteStaffAvailability,
  getAppointmentDetails,
  getAppointments,
  getAvailableSlots,
  getIncomeStats,
  getStaffProfile,
  getStaffSchedule,
  listStaffAvailability,
  listStaffServices,
  rejectAppointment,
  startAppointment,
  updateStaffAvailability,
} from "./staff.service.js";
import {
  appointmentActionSchema,
  appointmentIdSchema,
  availabilityIdSchema,
  availableSlotsQuerySchema,
  createAvailabilitySchema,
  incomeQuerySchema,
  scheduleQuerySchema,
  serviceIdSchema,
  updateAvailabilitySchema,
  validateStaffInput,
} from "./staff.validation.js";

// ─── Profile Handler ────────────────────────────────────────────────────
export const getProfileHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const userId = req.user.sub;

  const profile = await getStaffProfile(userId);
  successResponse(res, 200, t(tr.PROFILE_RETRIEVED_SUCCESSFULLY, lang), profile);
});

// ─── Schedule Handler ──────────────────────────────────────────────────
export const getScheduleHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const userId = req.user.sub;

  const { date } = validateStaffInput(scheduleQuerySchema, req.query);

  const schedule = await getStaffSchedule(userId, date);
  successResponse(res, 200, t(tr.SCHEDULE_RETRIEVED_SUCCESSFULLY, lang), schedule);
});

// ─── Appointmets Handler ──────────────────────────────────────────
export const getAppointmentsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const userId = req.user.sub;
  const statusFilter = req.query.status; // Optional status filter
  const validStatuses = ["pending", "accepted", "rejected", "started", "completed"];

  // Validate status filter if provided
  if (statusFilter && !validStatuses.includes(statusFilter.toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: t(tr.INVALID_STATUS_FILTER, lang),
    });
  }

  const requests = await getAppointments(userId, statusFilter ? statusFilter.toUpperCase() : undefined);
  successResponse(res, 200, t(tr.REQUESTS_RETRIEVED_SUCCESSFULLY, lang), requests);
});

export const getAppointmentsDetailsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const userId = req.user.sub;
  const requestId = req.params.id;
  if (!requestId) {
    return res.status(400).json({
      success: false,
      message: t(tr.REQUEST_ID_REQUIRED, lang),
    });
  }
  const appointment = await getAppointmentDetails(userId, requestId);
  successResponse(res, 200, t(tr.REQUEST_DETAILS_RETRIEVED_SUCCESSFULLY, lang), appointment);
});

// ─── Accept Appointment Handler ────────────────────────────────────────
export const acceptAppointmentHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const userId = req.user.sub;

  const { appointmentId } = validateStaffInput(appointmentIdSchema, req.params);

  const appointment = await acceptAppointment(userId, appointmentId);
  successResponse(res, 200, t(tr.APPOINTMENT_ACCEPTED, lang), appointment);
});

// ─── Reject Appointment Handler ────────────────────────────────────────
export const rejectAppointmentHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const userId = req.user.sub;

  const { appointmentId } = validateStaffInput(appointmentIdSchema, req.params);

  const appointment = await rejectAppointment(userId, appointmentId);
  successResponse(res, 200, t(tr.APPOINTMENT_REJECTED, lang), appointment);
});

// ─── Start Appointment Handler ─────────────────────────────────────────
export const startAppointmentHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const userId = req.user.sub;

  const { appointmentId } = validateStaffInput(appointmentIdSchema, req.params);

  const appointment = await startAppointment(userId, appointmentId);
  successResponse(res, 200, t(tr.APPOINTMENT_STARTED, lang), appointment);
});

// ─── Complete Appointment Handler ──────────────────────────────────────
export const completeAppointmentHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const userId = req.user.sub;

  const { appointmentId } = validateStaffInput(appointmentIdSchema, req.params);
  const data = validateStaffInput(appointmentActionSchema, req.body);

  const appointment = await completeAppointment(userId, appointmentId, data);
  successResponse(res, 200, t(tr.APPOINTMENT_COMPLETED, lang), appointment);
});

// ─── Income Stats Handler ──────────────────────────────────────────────
export const getIncomeStatsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const userId = req.user.sub;

  const { range } = validateStaffInput(incomeQuerySchema, req.query);

  const stats = await getIncomeStats(userId, range);
  successResponse(res, 200, t(tr.INCOME_RETRIEVED_SUCCESSFULLY, lang), stats);
});

// ─── List Services Handler ────────────────────────────────────────────
export const listServicesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const userId = req.user.sub;

  const services = await listStaffServices(userId);
  successResponse(res, 200, t(tr.SERVICES_RETRIEVED_SUCCESSFULLY, lang), services);
});

// ─── Add Service Handler ──────────────────────────────────────────────
export const addServiceHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const userId = req.user.sub;

  const { serviceId } = validateStaffInput(serviceIdSchema, req.body);

  const result = await addStaffService(userId, serviceId);
  successResponse(res, 201, t(tr.SERVICE_ADDED, lang), result);
});

// ─── List Availability Handler ────────────────────────────────────────
export const listAvailabilityHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const userId = req.user.sub;

  const availabilities = await listStaffAvailability(userId);
  successResponse(res, 200, t(tr.AVAILABILITY_RETRIEVED_SUCCESSFULLY, lang), availabilities);
});

// ─── Create Availability Handler ──────────────────────────────────────
export const createAvailabilityHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const userId = req.user.sub;

  const data = validateStaffInput(createAvailabilitySchema, req.body);

  const availability = await createStaffAvailability(userId, data);
  successResponse(res, 201, t(tr.AVAILABILITY_CREATED, lang), availability);
});

// ─── Update Availability Handler ──────────────────────────────────────
export const updateAvailabilityHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const userId = req.user.sub;

  const { availabilityId } = validateStaffInput(availabilityIdSchema, req.params);
  const data = validateStaffInput(updateAvailabilitySchema, req.body);

  const availability = await updateStaffAvailability(userId, availabilityId, data);
  successResponse(res, 200, t(tr.AVAILABILITY_UPDATED, lang), availability);
});

// ─── Delete Availability Handler ──────────────────────────────────────
export const deleteAvailabilityHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const userId = req.user.sub;

  const { availabilityId } = validateStaffInput(availabilityIdSchema, req.params);

  const result = await deleteStaffAvailability(userId, availabilityId);
  successResponse(res, 200, t(tr.AVAILABILITY_DELETED, lang), result);
});

// ─── Available Slots Handler ───────────────────────────────────────────
export const getAvailableSlotsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const userId = req.user.sub;

  const { date, serviceId } = validateStaffInput(availableSlotsQuerySchema, req.query);

  const slots = await getAvailableSlots(userId, date, serviceId);
  successResponse(res, 200, t(tr.SLOTS_RETRIEVED_SUCCESSFULLY, lang), slots);
});
