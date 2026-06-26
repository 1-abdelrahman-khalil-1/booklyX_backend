import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { requireActiveBranchSubscription } from "../../../middleware/branchAdminSubscription.js";
import {
    cancelAppointmentHandler,
    getAppointmentDetailsHandler,
    listAppointmentsHandler,
} from "./appointments.controller.js";

const appointmentsRouter = Router();

appointmentsRouter.use(authenticate, authorize(Role.branch_admin), requireActiveBranchSubscription);

appointmentsRouter.get("/", listAppointmentsHandler);
appointmentsRouter.get("/:id", getAppointmentDetailsHandler);
appointmentsRouter.patch("/:id/cancel", cancelAppointmentHandler);

export default appointmentsRouter;