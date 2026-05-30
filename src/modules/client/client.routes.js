import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/authenticate.js";
import dashboardRouter from "./dashboard/dashboard.routes.js";
import discoveryRouter from "./discovery/discovery.routes.js";
import branchesRouter from "./branches/branches.routes.js";
import staffRouter from "./staff/staff.routes.js";
import appointmentsRouter from "./appointments/appointments.routes.js";
import favouritesRouter from "./favourites/favourites.routes.js";
import { getServiceOffersHandler } from "./offers/offers.controller.js";

const clientRouter = Router();

clientRouter.use("/", dashboardRouter);
clientRouter.use("/", discoveryRouter);
clientRouter.use("/", branchesRouter);
clientRouter.use("/", staffRouter);
clientRouter.use("/", appointmentsRouter);
clientRouter.use("/", favouritesRouter);

// 17. Service Offers — list valid offers for a service before booking
clientRouter.get("/services/:id/offers", authenticate, authorize(Role.client), getServiceOffersHandler);

export default clientRouter;
