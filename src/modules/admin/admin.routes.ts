import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/authenticate.js";
import {
    approveApplicationHandler,
    getApplicationDetailHandler,
    listApplicationsHandler,
    rejectApplicationHandler,
} from "./admin.controller.js";

const adminRouter = Router();

/**
 * All routes in this router require authentication and super_admin role.
 */
adminRouter.use(authenticate, authorize(Role.super_admin));

/**
 * @route   GET /admin/applications
 * @desc    List business applications (filter by status via query)
 * @access  Private (Super Admin)
 */
adminRouter.get("/applications", listApplicationsHandler);

/**
 * @route   GET /admin/applications/:id
 * @desc    Get detailed application record
 * @access  Private (Super Admin)
 */
adminRouter.get("/applications/:id", getApplicationDetailHandler);

/**
 * @route   POST /admin/applications/:id/approve
 * @desc    Approve application and create User row
 * @access  Private (Super Admin)
 */
adminRouter.post("/applications/:id/approve", approveApplicationHandler);

/**
 * @route   POST /admin/applications/:id/reject
 * @desc    Reject application with reason
 * @access  Private (Super Admin)
 */
adminRouter.post("/applications/:id/reject", rejectApplicationHandler);

export default adminRouter;
