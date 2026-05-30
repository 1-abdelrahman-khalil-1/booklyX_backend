import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import {
    createStaffHandler,
    deleteStaffHandler,
    getMyStaffByIdHandler,
    getMyStaffHandler,
    updateStaffHandler,
} from "./staff.controller.js";

const staffRouter = Router();

staffRouter.get("/", authenticate, authorize(Role.branch_admin), getMyStaffHandler);
staffRouter.post("/", authenticate, authorize(Role.branch_admin), createStaffHandler);
staffRouter.get("/:id", authenticate, authorize(Role.branch_admin), getMyStaffByIdHandler);
staffRouter.put("/:id", authenticate, authorize(Role.branch_admin), updateStaffHandler);
staffRouter.delete("/:id", authenticate, authorize(Role.branch_admin), deleteStaffHandler);

export default staffRouter;