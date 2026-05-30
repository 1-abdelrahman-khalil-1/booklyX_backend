import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { zIdParamSchema } from "../../../lib/validation/primitives.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { branchAppointmentsQuerySchema, validateBranchAdminInput } from "../branch_admin.validation.js";
import { cancelAppointment, getAppointmentDetails, listAppointments } from "./appointments.service.js";

export const listAppointmentsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const query = validateBranchAdminInput(branchAppointmentsQuerySchema, req.query);
  const result = await listAppointments(req.user.sub, query);
  successResponse(res, 200, t(tr.APPOINTMENTS_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const getAppointmentDetailsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateBranchAdminInput(zIdParamSchema, req.params);
  const result = await getAppointmentDetails(id, req.user.sub);
  successResponse(res, 200, t(tr.APPOINTMENT_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const cancelAppointmentHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateBranchAdminInput(zIdParamSchema, req.params);
  const result = await cancelAppointment(id, req.user.sub);
  successResponse(res, 200, t(tr.APPOINTMENT_CANCELED_SUCCESSFULLY, lang), result);
});