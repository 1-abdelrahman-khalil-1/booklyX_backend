import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { searchBranchesHandler } from "./discovery.controller.js";

const discoveryRouter = Router();
discoveryRouter.use(authenticate, authorize(Role.client));

discoveryRouter.get("/discovery/search", searchBranchesHandler);

export default discoveryRouter;
