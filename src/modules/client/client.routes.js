import { Router } from "express";
import dashboardRouter from "./dashboard/dashboard.routes.js";
import discoveryRouter from "./discovery/discovery.routes.js";
import branchesRouter from "./branches/branches.routes.js";
import staffRouter from "./staff/staff.routes.js";
import appointmentsRouter from "./appointments/appointments.routes.js";
import favouritesRouter from "./favourites/favourites.routes.js";
import offersRouter from "./offers/offers.routes.js";

const clientRouter = Router();

clientRouter.use("/", dashboardRouter);
clientRouter.use("/", discoveryRouter);
clientRouter.use("/", branchesRouter);
clientRouter.use("/", staffRouter);
clientRouter.use("/", appointmentsRouter);
clientRouter.use("/", favouritesRouter);
clientRouter.use("/", offersRouter);

export default clientRouter;
