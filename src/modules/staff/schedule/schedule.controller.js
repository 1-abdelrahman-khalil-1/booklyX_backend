import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { scheduleQuerySchema, validateStaffInput } from "../staff.validation.js";
import { getStaffSchedule } from "./schedule.service.js";

export const getScheduleHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { date } = validateStaffInput(scheduleQuerySchema, req.query);
  const schedule = await getStaffSchedule(req.user.sub, date);
  successResponse(res, 200, t(tr.SCHEDULE_RETRIEVED_SUCCESSFULLY, lang), schedule);
});
