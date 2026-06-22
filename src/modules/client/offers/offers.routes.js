import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { getServiceOffersHandler, claimOfferHandler, getClaimedOffersHandler } from "./offers.controller.js";

const offersRouter = Router();

// 17. Service Offers — list valid offers for a service before booking
offersRouter.get("/services/:id/offers", authenticate, authorize(Role.client), getServiceOffersHandler);

// Claim offer
offersRouter.post("/offers/:id/claim", authenticate, authorize(Role.client), claimOfferHandler);

// List claimed offers
offersRouter.get("/offers/claimed", authenticate, authorize(Role.client), getClaimedOffersHandler);

export default offersRouter;
