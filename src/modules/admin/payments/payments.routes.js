import { Router } from "express";
import {
    getBranchPaymentDetailsHandler,
    listBranchPaymentsHandler,
    refundBranchPaymentHandler,
} from "./payments.controller.js";

const paymentsRouter = Router();

paymentsRouter.get("/", listBranchPaymentsHandler);
paymentsRouter.get("/:paymentId", getBranchPaymentDetailsHandler);
paymentsRouter.post("/:paymentId/refund", refundBranchPaymentHandler);

export default paymentsRouter;
