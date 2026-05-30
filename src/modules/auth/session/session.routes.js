import { Router } from "express";
import {
  loginHandler,
  logoutHandler,
  refreshHandler,
  verifyPhoneHandler,
} from "./session.controller.js";

const sessionRouter = Router();

sessionRouter.post("/verify-phone", verifyPhoneHandler);
sessionRouter.post("/login", loginHandler);
sessionRouter.post("/refresh", refreshHandler);
sessionRouter.post("/logout", logoutHandler);

export default sessionRouter;
