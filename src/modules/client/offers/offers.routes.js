import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { getServiceOffersHandler } from "./offers.controller.js";

const offersRouter = Router();

// 17. Service Offers — list valid offers for a service before booking
offersRouter.get("/services/:id/offers", authenticate, authorize(Role.client), getServiceOffersHandler);

export default offersRouter;
