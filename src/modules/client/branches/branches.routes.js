import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { getBranchProfileHandler, getBranchServicesHandler } from "./branches.controller.js";

const branchesRouter = Router();
branchesRouter.use(authenticate, authorize(Role.client));

branchesRouter.get("/branches/:id/profile", getBranchProfileHandler);
branchesRouter.get("/branches/:id/services", getBranchServicesHandler);

export default branchesRouter;
