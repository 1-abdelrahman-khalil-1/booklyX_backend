import { Router } from "express";
import {
    approveBranchHandler,
    getBranchDetailsHandler,
    listBranchesHandler,
    rejectBranchHandler,
} from "./branches.controller.js";

const branchesRouter = Router();

branchesRouter.get("/", listBranchesHandler);
branchesRouter.get("/:id", getBranchDetailsHandler);
branchesRouter.patch("/:id/approve", approveBranchHandler);
branchesRouter.patch("/:id/reject", rejectBranchHandler);

export default branchesRouter;
