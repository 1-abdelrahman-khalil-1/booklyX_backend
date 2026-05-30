import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { listServicesHandler, addServiceHandler } from "./services.controller.js";

const servicesRouter = Router();
servicesRouter.use(authenticate, authorize(Role.staff));

servicesRouter.get("/services", listServicesHandler);
servicesRouter.post("/services", addServiceHandler);

export default servicesRouter;
