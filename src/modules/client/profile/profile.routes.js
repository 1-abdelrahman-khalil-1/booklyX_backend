import { Router } from "express";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { Role } from "../../../generated/prisma/client.js";
import { getClientProfileHandler, updateClientProfileHandler } from "./client.controller.js";
import { imageOnlyUpload } from "../../../middleware/upload.js";

const profileRouter = Router();
const clientUploadField = imageOnlyUpload.fields([{ name: "profile_image", maxCount: 1 }]);
profileRouter.use(authenticate, authorize(Role.client));

profileRouter.get("/profile", getClientProfileHandler);
profileRouter.put("/profile", clientUploadField, updateClientProfileHandler);

export default profileRouter;