import { Router } from "express";
import {
    approveServiceHandler,
    getServiceDetailsHandler,
    listServicesHandler,
    rejectServiceHandler,
} from "./services.controller.js";

const servicesRouter = Router();

servicesRouter.get("/", listServicesHandler);
servicesRouter.get("/:id", getServiceDetailsHandler);
servicesRouter.patch("/:id/approve", approveServiceHandler);
servicesRouter.patch("/:id/reject", rejectServiceHandler);

export default servicesRouter;
