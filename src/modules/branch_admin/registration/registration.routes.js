import { Router } from "express";
import { documentsUpload } from "../../../middleware/upload.js";
import {
    applyHandler,
    resendCodeHandler,
    verifyEmailHandler,
    verifyPhoneHandler,
} from "./registration.controller.js";

const registrationRouter = Router();

const branchSubmissionUploadFields = documentsUpload.fields([
  { name: "logo", maxCount: 1 },
  { name: "taxCertificate", maxCount: 1 },
  { name: "commercialRegister", maxCount: 1 },
  { name: "nationalId", maxCount: 1 },
  { name: "facilityLicense", maxCount: 1 },
]);

registrationRouter.post("/apply", branchSubmissionUploadFields, applyHandler);
registrationRouter.post("/verify-email", verifyEmailHandler);
registrationRouter.post("/verify-phone", verifyPhoneHandler);
registrationRouter.post("/resend-code", resendCodeHandler);

export default registrationRouter;