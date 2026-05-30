import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { zIdParamSchema } from "../../../lib/validation/primitives.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { createStaffSchema, updateStaffSchema, validateBranchAdminInput } from "../branch_admin.validation.js";
import { createStaff, deleteStaff, getMyStaff, getMyStaffById, updateStaff } from "./staff.service.js";

export const createStaffHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateBranchAdminInput(createStaffSchema, req.body);
  const result = await createStaff(data, req.user.sub);
  successResponse(res, 201, t(tr.STAFF_CREATED, lang), result);
});

export const getMyStaffHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await getMyStaff(req.user.sub);
  successResponse(res, 200, t(tr.STAFF_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const updateStaffHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateBranchAdminInput(updateStaffSchema, { ...req.body, id: req.params.id });
  const result = await updateStaff(data, req.user.sub);
  successResponse(res, 200, t(tr.STAFF_UPDATED, lang), result);
});

export const getMyStaffByIdHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateBranchAdminInput(zIdParamSchema, req.params);
  const result = await getMyStaffById(id, req.user.sub);
  successResponse(res, 200, t(tr.STAFF_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const deleteStaffHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateBranchAdminInput(zIdParamSchema, req.params);
  const result = await deleteStaff(id, req.user.sub);
  successResponse(res, 200, t(result.message, lang));
});