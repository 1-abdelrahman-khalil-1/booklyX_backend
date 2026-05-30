import { z } from "zod";
import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { zId, zIdParamSchema } from "../../../lib/validation/primitives.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import {
  getServiceStaff,
  getStaffAvailableDays,
  getStaffAvailableSlots,
  getStaffProfile,
} from "./staff.service.js";
import { validateClientInput } from "../client.validation.js";

export const getServiceStaffHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const result = await getServiceStaff(id);
  successResponse(res, 200, t(tr.STAFF_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const getStaffProfileHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const result = await getStaffProfile(id);
  successResponse(res, 200, t(tr.PROFILE_RETRIEVED_SUCCESSFULLY, lang), result);
});

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
