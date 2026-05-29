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
  changeSubscriptionPlanHandler,
  createServiceHandler,
  createStaffHandler,
  deleteServiceHandler,
  deleteStaffHandler,
  exportFinanceReportHandler,
  getAppointmentDetailsHandler,
  getBranchAdminProfileHandler,
  getBranchDashboardStatsHandler,
  getBranchFinanceStatsHandler,
  getMyServiceCategoriesHandler,
  getMyServicesHandler,
  getMyStaffByIdHandler,
  getMyStaffHandler,
  getRecentBookingsHandler,
  getRecentTransactionsHandler,
  getRevenueChartDataHandler,
  getStaffEarningsHandler,
  getTopServicesHandler,
  listAppointmentsHandler,
  listFinancePaymentsHandler,
  processBookingPaymentRefundHandler,
  renewSubscriptionHandler,
  resendCodeHandler,
  updateBookingSettingsHandler,
  updateBranchAdminProfileHandler,
  updateBranchAvailabilityHandler,
  updateNotificationSettingsHandler,
  updateServiceHandler,
  updateStaffHandler,
  verifyEmailHandler,
  verifyPhoneHandler
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

branchAdminRouter.put(
  "/subscription/:id",
  authenticate,
  authorize(Role.branch_admin),
  changeSubscriptionPlanHandler,
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
  "/staff",
  authenticate,
  authorize(Role.branch_admin),
  createStaffHandler,
);

branchAdminRouter.get(
  "/staff",
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
  "/services",
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

// --- Analytics Overview Module ---
branchAdminRouter.get(
  "/analytics/revenue-chart",
  authenticate,
  authorize(Role.branch_admin),
  getRevenueChartDataHandler,
);

branchAdminRouter.get(
  "/analytics/recent-bookings",
  authenticate,
  authorize(Role.branch_admin),
  getRecentBookingsHandler,
);

branchAdminRouter.get(
  "/analytics/top-services",
  authenticate,
  authorize(Role.branch_admin),
  getTopServicesHandler,
);

branchAdminRouter.get(
  "/analytics/recent-transactions",
  authenticate,
  authorize(Role.branch_admin),
  getRecentTransactionsHandler,
);

// --- Finance Module ---
branchAdminRouter.get(
  "/finance/stats",
  authenticate,
  authorize(Role.branch_admin),
  getBranchFinanceStatsHandler,
);

branchAdminRouter.get(
  "/finance/payments",
  authenticate,
  authorize(Role.branch_admin),
  listFinancePaymentsHandler,
);

branchAdminRouter.post(
  "/finance/payments/:id/refund",
  authenticate,
  authorize(Role.branch_admin),
  processBookingPaymentRefundHandler,
);

branchAdminRouter.get(
  "/finance/export-report",
  authenticate,
  authorize(Role.branch_admin),
  exportFinanceReportHandler,
);

export default branchAdminRouter;
