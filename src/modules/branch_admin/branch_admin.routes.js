import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/authenticate.js";
import {
    addServiceCategoryHandler,
    applyHandler,
    createServiceHandler,
    createStaffHandler,
    deleteServiceHandler,
    getMyServiceCategoriesHandler,
    getMyServicesHandler,
    resendCodeHandler,
    updateServiceHandler,
    verifyEmailHandler,
    verifyPhoneHandler,
} from "./branch_admin.controller.js";

const branchAdminRouter = Router();

branchAdminRouter.post("/apply", applyHandler);

branchAdminRouter.post("/verify-email", verifyEmailHandler);

branchAdminRouter.post("/verify-phone", verifyPhoneHandler);

branchAdminRouter.post("/resend-code", resendCodeHandler);

branchAdminRouter.post(
  "/create-staff",
  authenticate,
  authorize(Role.branch_admin),
  createStaffHandler,
);

branchAdminRouter.post(
  "/services/categories",
  authenticate,
  authorize(Role.branch_admin),
  addServiceCategoryHandler,
);

branchAdminRouter.get(
  "/services/categories",
  authenticate,
  authorize(Role.branch_admin),
  getMyServiceCategoriesHandler,
);

branchAdminRouter.post(
  "/services/create-service",
  authenticate,
  authorize(Role.branch_admin),
  createServiceHandler,
);

branchAdminRouter.get(
  "/services/my-services",
  authenticate,
  authorize(Role.branch_admin),
  getMyServicesHandler,
);

branchAdminRouter.put(
  "/services/:id",
  authenticate,
  authorize(Role.branch_admin),
  updateServiceHandler,
);

branchAdminRouter.delete(
  "/services/:id",
  authenticate,
  authorize(Role.branch_admin),
  deleteServiceHandler,
);
export default branchAdminRouter;
