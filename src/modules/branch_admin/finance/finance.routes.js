import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import {
    exportFinanceReportHandler,
    getBranchFinanceStatsHandler,
    listFinancePaymentsHandler,
    processBookingPaymentRefundHandler,
} from "./finance.controller.js";

const financeRouter = Router();

financeRouter.get("/stats", authenticate, authorize(Role.branch_admin), getBranchFinanceStatsHandler);
financeRouter.get("/payments", authenticate, authorize(Role.branch_admin), listFinancePaymentsHandler);
financeRouter.post(
  "/payments/:id/refund",
  authenticate,
  authorize(Role.branch_admin),
  processBookingPaymentRefundHandler,
);
financeRouter.get("/export-report", authenticate, authorize(Role.branch_admin), exportFinanceReportHandler);

export default financeRouter;