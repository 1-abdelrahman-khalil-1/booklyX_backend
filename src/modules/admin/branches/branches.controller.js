import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { zIdParamSchema } from "../../../lib/validation/primitives.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { listBranchesQuerySchema, rejectReasonSchema, validateAdminInput } from "../admin.validation.js";
import { approveBranch, getBranchDetails, listBranches, rejectBranch } from "./branches.service.js";

export const listBranchesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { status } = validateAdminInput(listBranchesQuerySchema, req.query);
  const result = await listBranches(status);
  successResponse(res, 200, t(tr.BRANCH_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const getBranchDetailsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateAdminInput(zIdParamSchema, req.params);
  const result = await getBranchDetails(id);
  successResponse(res, 200, t(tr.BRANCH_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const approveBranchHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateAdminInput(zIdParamSchema, req.params);
  const result = await approveBranch(id);
  successResponse(res, 200, t(result.message, lang));
});

export const rejectBranchHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateAdminInput(zIdParamSchema, req.params);
  const { reason } = validateAdminInput(rejectReasonSchema, req.body);
  const result = await rejectBranch(id, reason);
  successResponse(res, 200, t(result.message, lang));
});
