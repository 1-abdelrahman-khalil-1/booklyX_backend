import { Router } from "express";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { Role } from "../../../generated/prisma/client.js";
import { getClientProfileHandler, updateClientProfileHandler } from "./client.controller.js";

const profileRouter = Router();
profileRouter.use(authenticate, authorize(Role.client));

profileRouter.get("/profile", getClientProfileHandler);
profileRouter.put("/profile", updateClientProfileHandler);

export default profileRouter;