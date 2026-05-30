import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { createIdParamSchema } from "../../../lib/validation/primitives.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import {
    appointmentActionSchema,
    appointmentsQuerySchema,
    validateStaffInput,
} from "../staff.validation.js";
import {
    completeAppointment,
    getAppointmentDetails,
    getAppointments,
    startAppointment,
} from "./appointments.service.js";

export const getAppointmentsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { status } = validateStaffInput(appointmentsQuerySchema, req.query);
  const requests = await getAppointments(req.user.sub, status);
  successResponse(res, 200, t(tr.REQUESTS_RETRIEVED_SUCCESSFULLY, lang), requests);
});

export const getAppointmentsDetailsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id: requestId } = validateStaffInput(createIdParamSchema("id"), req.params);
  const appointment = await getAppointmentDetails(req.user.sub, requestId);
  successResponse(res, 200, t(tr.REQUEST_DETAILS_RETRIEVED_SUCCESSFULLY, lang), appointment);
});

export const startAppointmentHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { appointmentId } = validateStaffInput(createIdParamSchema("appointmentId"), req.params);
  const appointment = await startAppointment(req.user.sub, appointmentId);
  successResponse(res, 200, t(tr.APPOINTMENT_STARTED, lang), appointment);
});

export const completeAppointmentHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { appointmentId } = validateStaffInput(createIdParamSchema("appointmentId"), req.params);
  const data = validateStaffInput(appointmentActionSchema, req.body);
  const appointment = await completeAppointment(req.user.sub, appointmentId, data);
  successResponse(res, 200, t(tr.APPOINTMENT_COMPLETED, lang), appointment);
});
