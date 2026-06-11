import { Router } from "express";
import { getFinancialSummaryHandler } from "./financial.controller.js";

const financialRouter = Router();

financialRouter.get("/summary", getFinancialSummaryHandler);

export default financialRouter;
