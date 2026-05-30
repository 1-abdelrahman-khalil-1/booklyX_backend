import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { createIdParamSchema } from "../../../lib/validation/primitives.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import {
    availableSlotsQuerySchema,
    createAvailabilitySchema,
    updateAvailabilitySchema,
    validateStaffInput,
} from "../staff.validation.js";
import {
    createStaffAvailability,
    deleteStaffAvailability,
    getAvailableSlots,
    listStaffAvailability,
    updateStaffAvailability,
} from "./availability.service.js";

export const listAvailabilityHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const availabilities = await listStaffAvailability(req.user.sub);
  successResponse(res, 200, t(tr.AVAILABILITY_RETRIEVED_SUCCESSFULLY, lang), availabilities);
});

export const createAvailabilityHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateStaffInput(createAvailabilitySchema, req.body);
  const availability = await createStaffAvailability(req.user.sub, data);
  successResponse(res, 201, t(tr.AVAILABILITY_CREATED, lang), availability);
});

export const updateAvailabilityHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { availabilityId } = validateStaffInput(createIdParamSchema("availabilityId"), req.params);
  const data = validateStaffInput(updateAvailabilitySchema, req.body);
  const availability = await updateStaffAvailability(req.user.sub, availabilityId, data);
  successResponse(res, 200, t(tr.AVAILABILITY_UPDATED, lang), availability);
});

export const deleteAvailabilityHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { availabilityId } = validateStaffInput(createIdParamSchema("availabilityId"), req.params);
  const result = await deleteStaffAvailability(req.user.sub, availabilityId);
  successResponse(res, 200, t(tr.AVAILABILITY_DELETED, lang), result);
});

export const getAvailableSlotsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { date, serviceId } = validateStaffInput(availableSlotsQuerySchema, req.query);
  const slots = await getAvailableSlots(req.user.sub, date, serviceId);
  successResponse(res, 200, t(tr.SLOTS_RETRIEVED_SUCCESSFULLY, lang), slots);
});
