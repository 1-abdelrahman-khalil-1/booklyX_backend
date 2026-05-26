import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/authenticate.js";
import {
    createOfferHandler,
    deleteOfferHandler,
    listBranchOffersHandler,
    toggleOfferHandler,
    updateOfferHandler,
} from "./offers.controller.js";

const offersRouter = Router();

offersRouter.use(authenticate, authorize(Role.branch_admin));

offersRouter.post("/", createOfferHandler);
offersRouter.put("/:id", updateOfferHandler);
offersRouter.patch("/:id/toggle", toggleOfferHandler);
offersRouter.delete("/:id", deleteOfferHandler);
offersRouter.get("/", listBranchOffersHandler);

export default offersRouter;
