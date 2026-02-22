import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  loginHandler,
  registerHandler,
  requestPasswordResetHandler,
  resetPasswordHandler,
  sendPhoneVerificationHandler,
  sendVerificationEmailHandler,
  verifyEmailHandler,
  verifyPasswordResetHandler,
  verifyPhoneHandler,
} from "./auth.controller.js";

const router = Router();

// Public endpoints
router.post("/login", loginHandler);
router.post("/register", registerHandler);

// Email verification (public)
router.post("/send-verification-email", sendVerificationEmailHandler);
router.post("/verify-email", verifyEmailHandler);

// Password reset (public) — 3-step OTP flow
router.post("/request-password-reset", requestPasswordResetHandler);
router.post("/verify-password-reset", verifyPasswordResetHandler);
router.post("/reset-password", resetPasswordHandler);

// Phone verification (requires authentication)
router.post("/send-phone-verification", authenticate, sendPhoneVerificationHandler);
router.post("/verify-phone", authenticate, verifyPhoneHandler);

export default router;
