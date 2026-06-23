import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { searchDiscovery } from "./discovery.service.js";
import { discoverySearchSchema, validateClientInput } from "../client.validation.js";

export const searchBranchesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const query = validateClientInput(discoverySearchSchema, req.query);
  const result = await searchDiscovery(query);
  successResponse(res, 200, t(tr.SEARCH_COMPLETED_SUCCESSFULLY, lang), result);
});

export const searchServicesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const query = validateClientInput(discoverySearchSchema, req.query);
  const result = await searchDiscovery({ ...query, type: "services" });
  successResponse(res, 200, t(tr.SEARCH_COMPLETED_SUCCESSFULLY, lang), result);
});
