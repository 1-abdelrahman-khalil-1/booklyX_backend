import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/authenticate.js";
import { documentsUpload, imageOnlyUpload } from "../../middleware/upload.js";
import {
  activateSubscriptionHandler,
  addServiceCategoryHandler,
  applyHandler,
  cancelAppointmentHandler,
  cancelSubscriptionHandler,
  createServiceHandler,
  createStaffHandler,
  deleteServiceHandler,
  deleteStaffHandler,
  getAppointmentDetailsHandler,
  getBookingPaymentDetailsHandler,
  getBranchAdminProfileHandler,
  getBranchDashboardStatsHandler,
  getBranchPublicProfileHandler,
  getMyServiceCategoriesHandler,
  getMyServicesHandler,
  getMyStaffByIdHandler,
  getMyStaffHandler,
  getStaffEarningsHandler,
  listAppointmentsHandler,
  listBookingPaymentsHandler,
  renewSubscriptionHandler,
  resendCodeHandler,
  updateBookingSettingsHandler,
  updateBranchAdminProfileHandler,
  updateBranchAvailabilityHandler,
  updateNotificationSettingsHandler,
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

branchAdminRouter.post(
  "/subscription/renew",
  authenticate,
  authorize(Role.branch_admin),
  renewSubscriptionHandler,
);

branchAdminRouter.post(
  "/subscription/cancel",
  authenticate,
  authorize(Role.branch_admin),
  cancelSubscriptionHandler,
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

branchAdminRouter.put(
  "/availability",
  authenticate,
  authorize(Role.branch_admin),
  updateBranchAvailabilityHandler,
);

branchAdminRouter.put(
  "/booking-settings",
  authenticate,
  authorize(Role.branch_admin),
  updateBookingSettingsHandler,
);

branchAdminRouter.put(
  "/notification-settings",
  authenticate,
  authorize(Role.branch_admin),
  updateNotificationSettingsHandler,
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

branchAdminRouter.get(
  "/appointments",
  authenticate,
  authorize(Role.branch_admin),
  listAppointmentsHandler,
);

branchAdminRouter.get(
  "/appointments/:id",
  authenticate,
  authorize(Role.branch_admin),
  getAppointmentDetailsHandler,
);

branchAdminRouter.patch(
  "/appointments/:id/cancel",
  authenticate,
  authorize(Role.branch_admin),
  cancelAppointmentHandler,
);

branchAdminRouter.get(
  "/booking-payments",
  authenticate,
  authorize(Role.branch_admin),
  listBookingPaymentsHandler,
);

branchAdminRouter.get(
  "/booking-payments/:id",
  authenticate,
  authorize(Role.branch_admin),
  getBookingPaymentDetailsHandler,
);

// Public branch profile with reviews (clients and branch_admin can view)
branchAdminRouter.get(
  "/:id/profile",
  authenticate,
  authorize(Role.client, Role.branch_admin, Role.super_admin),
  getBranchPublicProfileHandler,
);

export default branchAdminRouter;
