import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { getProfileHandler } from "./profile.controller.js";

const profileRouter = Router();
profileRouter.use(authenticate, authorize(Role.staff));

profileRouter.get("/profile", getProfileHandler);

export default profileRouter;
