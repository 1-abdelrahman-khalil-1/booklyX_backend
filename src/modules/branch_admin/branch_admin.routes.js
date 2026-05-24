import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/authenticate.js";
import { documentsUpload, imageOnlyUpload } from "../../middleware/upload.js";
import {
  activateSubscriptionHandler,
  addServiceCategoryHandler,
  applyHandler,
  createServiceHandler,
  createStaffHandler,
  deleteServiceHandler,
  deleteStaffHandler,
  getBranchAdminProfileHandler,
  getBranchDashboardStatsHandler,
  getBranchPublicProfileHandler,
  getMyServiceCategoriesHandler,
  getMyServicesHandler,
  getMyStaffByIdHandler,
  getMyStaffHandler,
  getStaffEarningsHandler,
  resendCodeHandler,
  updateBranchAdminProfileHandler,
  updateServiceHandler,
  updateStaffHandler,
  verifyEmailHandler,
  verifyPhoneHandler,
} from "./branch_admin.controller.js";

const branchAdminRouter = Router();

const branchSubmissionUploadFields = documentsUpload.fields([
  { name: "logo", maxCount: 1 },
  { name: "taxCertificate", maxCount: 1 },
  { name: "commercialRegister", maxCount: 1 },
  { name: "nationalId", maxCount: 1 },
  { name: "facilityLicense", maxCount: 1 },
]);

const serviceUploadField = imageOnlyUpload.fields([{ name: "image", maxCount: 1 }]);
const profileUploadField = imageOnlyUpload.fields([{ name: "logo", maxCount: 1 }]);

branchAdminRouter.post("/apply", branchSubmissionUploadFields, applyHandler);

branchAdminRouter.post("/verify-email", verifyEmailHandler);

branchAdminRouter.post("/verify-phone", verifyPhoneHandler);

branchAdminRouter.post("/resend-code", resendCodeHandler);

branchAdminRouter.post(
  "/subscription/activate",
  authenticate,
  authorize(Role.branch_admin),
  activateSubscriptionHandler,
);

branchAdminRouter.get(
  "/profile",
  authenticate,
  authorize(Role.branch_admin),
  getBranchAdminProfileHandler,
);

branchAdminRouter.post(
  "/services",
  authenticate,
  authorize(Role.branch_admin),
  serviceUploadField,
  createServiceHandler,
);

branchAdminRouter.put(
  "/profile",
  authenticate,
  authorize(Role.branch_admin),
  profileUploadField,
  updateBranchAdminProfileHandler,
);

branchAdminRouter.post(
  "/create-staff",
  authenticate,
  authorize(Role.branch_admin),
  createStaffHandler,
);

branchAdminRouter.get(
  "/staff/my-staff",
  authenticate,
  authorize(Role.branch_admin),
  getMyStaffHandler,
);

branchAdminRouter.get(
  "/staff/:id",
  authenticate,
  authorize(Role.branch_admin),
  getMyStaffByIdHandler,
);

branchAdminRouter.put(
  "/staff/:id",
  authenticate,
  authorize(Role.branch_admin),
  updateStaffHandler,
);

branchAdminRouter.delete(
  "/staff/:id",
  authenticate,
  authorize(Role.branch_admin),
  deleteStaffHandler,
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
  serviceUploadField,
  createServiceHandler,
);

branchAdminRouter.get(
  "/services/my-services",
  authenticate,
  authorize(Role.branch_admin),
  getMyServicesHandler,
);

branchAdminRouter.get(
  "/analytics/dashboard",
  authenticate,
  authorize(Role.branch_admin),
  getBranchDashboardStatsHandler,
);

branchAdminRouter.get(
  "/analytics/staff-earnings",
  authenticate,
  authorize(Role.branch_admin),
  getStaffEarningsHandler,
);

// Backward-compatible alias.
branchAdminRouter.get(
  "/my-services",
  authenticate,
  authorize(Role.branch_admin),
  getMyServicesHandler,
);

branchAdminRouter.put(
  "/services/:id",
  authenticate,
  authorize(Role.branch_admin),
  serviceUploadField,
  updateServiceHandler,
);

branchAdminRouter.delete(
  "/services/:id",
  authenticate,
  authorize(Role.branch_admin),
  deleteServiceHandler,
);

// Public branch profile with reviews (clients and branch_admin can view)
branchAdminRouter.get(
  "/:id/profile",
  authenticate,
  authorize(Role.client, Role.branch_admin, Role.super_admin),
  getBranchPublicProfileHandler,
);

export default branchAdminRouter;
