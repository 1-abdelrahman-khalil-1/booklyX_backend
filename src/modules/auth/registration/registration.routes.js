import { Router } from "express";
import { registerHandler, verifyEmailHandler, resendCodeHandler } from "./registration.controller.js";

const registrationRouter = Router();

registrationRouter.post("/register", registerHandler);
registrationRouter.post("/verify-email", verifyEmailHandler);
registrationRouter.post("/resend-code", resendCodeHandler);

export default registrationRouter;
