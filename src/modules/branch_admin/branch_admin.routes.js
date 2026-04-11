import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/authenticate.js";
import { documentsUpload, imageOnlyUpload } from "../../middleware/upload.js";
import {
<<<<<<< Updated upstream
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
=======
  applyHandler,
  createServiceHandler,
  createStaffHandler,
  getMyServicesHandler,
  resendCodeHandler,
  verifyEmailHandler,
  verifyPhoneHandler,
>>>>>>> Stashed changes
} from "./branch_admin.controller.js";

const branchAdminRouter = Router();

const applicationUploadFields = documentsUpload.fields([
  { name: "logo", maxCount: 1 },
  { name: "taxCertificate", maxCount: 1 },
  { name: "commercialRegister", maxCount: 1 },
  { name: "nationalId", maxCount: 1 },
  { name: "facilityLicense", maxCount: 1 },
]);

const serviceUploadField = imageOnlyUpload.fields([{ name: "image", maxCount: 1 }]);

branchAdminRouter.post("/apply", applicationUploadFields, applyHandler);

branchAdminRouter.post("/verify-email", verifyEmailHandler);

branchAdminRouter.post("/verify-phone", verifyPhoneHandler);

branchAdminRouter.post("/resend-code", resendCodeHandler);

branchAdminRouter.post(
  "/services",
  authenticate,
  authorize(Role.branch_admin),
  createServiceHandler,
);

branchAdminRouter.post(
  "/create-staff",
  authenticate,
  authorize(Role.branch_admin),
  createStaffHandler,
);

<<<<<<< Updated upstream
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
=======
branchAdminRouter.get(
  "/my-services",
>>>>>>> Stashed changes
  authenticate,
  authorize(Role.branch_admin),
  getMyServicesHandler,
);
<<<<<<< Updated upstream

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
=======
>>>>>>> Stashed changes
export default branchAdminRouter;
