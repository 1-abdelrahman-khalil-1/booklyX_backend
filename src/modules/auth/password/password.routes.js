import { Router } from "express";
import {
  requestPasswordResetHandler,
  verifyPasswordResetHandler,
  resetPasswordHandler,
} from "./password.controller.js";

const passwordRouter = Router();

passwordRouter.post("/request-password-reset", requestPasswordResetHandler);
passwordRouter.post("/verify-password-reset", verifyPasswordResetHandler);
passwordRouter.post("/reset-password", resetPasswordHandler);

export default passwordRouter;
