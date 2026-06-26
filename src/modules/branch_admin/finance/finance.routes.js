import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { requireActiveBranchSubscription } from "../../../middleware/branchAdminSubscription.js";
import {
    exportFinanceReportHandler,
    getBranchFinanceStatsHandler,
    listFinancePaymentsHandler,
    processBookingPaymentRefundHandler,
} from "./finance.controller.js";

const financeRouter = Router();

financeRouter.use(authenticate, authorize(Role.branch_admin), requireActiveBranchSubscription);

financeRouter.get("/stats", getBranchFinanceStatsHandler);
financeRouter.get("/payments", listFinancePaymentsHandler);
financeRouter.post("/payments/:id/refund", processBookingPaymentRefundHandler);
financeRouter.get("/export-report", exportFinanceReportHandler);

export default financeRouter;