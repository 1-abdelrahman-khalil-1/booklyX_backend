import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import {
    authenticate,
    authorize,
} from "../../middleware/authenticate.js";
import { createUserHandler } from "./users.controller.js";

const router = Router();

// Only SUPER_ADMIN and BRANCH_ADMIN can create users (staff, other admins, etc.)
// CLIENT registration will be a separate public endpoint in auth module.
router.post(
  "/",
  authenticate,
  authorize(Role.super_admin, Role.branch_admin),
  createUserHandler,
);

export default router;
