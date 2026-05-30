import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { imageOnlyUpload } from "../../../middleware/upload.js";
import {
    createOfferHandler,
    deleteOfferHandler,
    listBranchOffersHandler,
    toggleOfferHandler,
    updateOfferHandler,
} from "./offers.controller.js";

const offersRouter = Router();
const offerUploadField = imageOnlyUpload.fields([{ name: "image", maxCount: 1 }]);

offersRouter.use(authenticate, authorize(Role.branch_admin));

offersRouter.post("/", offerUploadField, createOfferHandler);
offersRouter.put("/:id", offerUploadField, updateOfferHandler);
offersRouter.patch("/:id/toggle", toggleOfferHandler);
offersRouter.delete("/:id", deleteOfferHandler);
offersRouter.get("/", listBranchOffersHandler);

export default offersRouter;
