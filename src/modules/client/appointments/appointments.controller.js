import { z } from "zod";
import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { zIdParamSchema } from "../../../lib/validation/primitives.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import {
  cancelAppointment,
  confirmAppointmentPayment,
  getAppointmentDetails,
  getClientAppointments,
  reserveAppointment,
} from "./appointments.service.js";
import { reserveAppointmentSchema, validateClientInput } from "../client.validation.js";

export const reserveAppointmentHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateClientInput(reserveAppointmentSchema, req.body);
  const result = await reserveAppointment(data, req.user);
  successResponse(res, 201, t(tr.APPOINTMENT_RESERVED_SUCCESSFULLY, lang), {
    appointment: result.appointment,
    payment: result.payment,
    appliedOffer: result.appliedOffer,
  });
});

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

export const getClientAppointmentsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await getClientAppointments(req.user);
  successResponse(res, 200, t(tr.APPOINTMENTS_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const getAppointmentDetailsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const result = await getAppointmentDetails(id, req.user);
  successResponse(res, 200, t(tr.APPOINTMENT_DETAILS_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const cancelAppointmentHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const result = await cancelAppointment(id, req.user);
  successResponse(res, 200, t(result.message, lang), {
    appointment: result.appointment,
    payment: result.payment,
  });
});
