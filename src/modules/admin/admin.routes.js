import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/authenticate.js";
import {
    approveApplicationHandler,
    approveServiceHandler,
    getApplicationDetailHandler,
    listApplicationsHandler,
    listPendingServicesHandler,
    rejectApplicationHandler,
    rejectServiceHandler,
} from "./admin.controller.js";

const adminRouter = Router();

/**
 * All routes in this router require authentication and super_admin role.
 */
adminRouter.use(authenticate, authorize(Role.super_admin));

adminRouter.get("/applications", listApplicationsHandler);

adminRouter.get("/applications/:id", getApplicationDetailHandler);

adminRouter.post("/applications/:id/approve", approveApplicationHandler);

adminRouter.post("/applications/:id/reject", rejectApplicationHandler);

adminRouter.get("/services/pending", listPendingServicesHandler);

adminRouter.post("/services/:id/approve", approveServiceHandler);

adminRouter.post("/services/:id/reject", rejectServiceHandler);

export default adminRouter;
