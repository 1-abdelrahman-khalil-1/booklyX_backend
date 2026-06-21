import { Router } from "express";
import {
    approveBranchHandler,
    getBranchDetailsHandler,
    listBranchesHandler,
    rejectBranchHandler,
    toggleBlockBranchHandler,
} from "./branches.controller.js";

const branchesRouter = Router();

branchesRouter.get("/", listBranchesHandler);
branchesRouter.get("/:id", getBranchDetailsHandler);
branchesRouter.patch("/:id/approve", approveBranchHandler);
branchesRouter.patch("/:id/reject", rejectBranchHandler);
branchesRouter.patch("/:id/toggle-block", toggleBlockBranchHandler);

export default branchesRouter;
