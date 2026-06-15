import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { getIncomeHistoryHandler, getIncomeStatsHandler } from "./income.controller.js";

const incomeRouter = Router();
incomeRouter.use(authenticate, authorize(Role.staff));

incomeRouter.get("/income", getIncomeStatsHandler);
incomeRouter.get("/income/history", getIncomeHistoryHandler);

export default incomeRouter;
