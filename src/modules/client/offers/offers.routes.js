import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { getValidOffersHandler, claimOfferHandler, getClaimedOffersHandler } from "./offers.controller.js";

const offersRouter = Router();

// List valid offers (not claimed by client)
offersRouter.get("/offers", authenticate, authorize(Role.client), getValidOffersHandler);

// Claim offer
offersRouter.post("/offers/:id/claim", authenticate, authorize(Role.client), claimOfferHandler);

// List claimed offers
offersRouter.get("/offers/claimed", authenticate, authorize(Role.client), getClaimedOffersHandler);

export default offersRouter;
