import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { updateBookingSettingsSchema, updateBranchAdminProfileSchema, updateBranchAvailabilitySchema, updateNotificationSettingsSchema, validateBranchAdminInput } from "../branch_admin.validation.js";
import { getBranchAdminProfile, updateBookingSettings, updateBranchAdminProfile, updateBranchAvailability, updateNotificationSettings } from "./profile.service.js";

export const getBranchAdminProfileHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await getBranchAdminProfile(req.user.sub);
  successResponse(res, 200, t(tr.BRANCH_PROFILE_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const updateBranchAdminProfileHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateBranchAdminInput(updateBranchAdminProfileSchema, req.body);
  const result = await updateBranchAdminProfile(data, req.user.sub);
  successResponse(res, 200, t(tr.PROFILE_UPDATED_SUCCESSFULLY, lang), result);
});

export const updateBranchAvailabilityHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateBranchAdminInput(updateBranchAvailabilitySchema, req.body);
  const result = await updateBranchAvailability(data, req.user.sub);
  successResponse(res, 200, t(tr.BRANCH_AVAILABILITY_UPDATED_SUCCESSFULLY, lang), result);
});

export const updateBookingSettingsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateBranchAdminInput(updateBookingSettingsSchema, req.body);
  const result = await updateBookingSettings(data, req.user.sub);
  successResponse(res, 200, t(tr.BOOKING_SETTINGS_UPDATED_SUCCESSFULLY, lang), result);
});

export const updateNotificationSettingsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateBranchAdminInput(updateNotificationSettingsSchema, req.body);
  const result = await updateNotificationSettings(data, req.user.sub);
  successResponse(res, 200, t(tr.NOTIFICATION_SETTINGS_UPDATED_SUCCESSFULLY, lang), result);
});