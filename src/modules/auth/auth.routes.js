import { Router } from "express";
import {
  loginHandler,
  registerHandler,
  requestPasswordResetHandler,
  resendCodeHandler,
  resetPasswordHandler,
  verifyEmailHandler,
  verifyPasswordResetHandler,
  verifyPhoneHandler,
} from "./auth.controller.js";

const router = Router();

// ─── Registration Funnel (public) ─────────────────────────────────────────────
// Step 1: Create account → email OTP sent automatically
router.post("/register", registerHandler);
// Step 2: Verify email code → phone OTP sent automatically
router.post("/verify-email", verifyEmailHandler);
// Step 3: Verify phone code → returns token + user (fully logged in)
router.post("/verify-phone", verifyPhoneHandler);

router.post("/login", loginHandler);
router.post("/resend-code", resendCodeHandler);

router.post("/request-password-reset", requestPasswordResetHandler);
router.post("/verify-password-reset", verifyPasswordResetHandler);
router.post("/reset-password", resetPasswordHandler);

export default router;
