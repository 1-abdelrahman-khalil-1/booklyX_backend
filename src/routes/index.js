import { Router } from "express";
import adminRoutes from "../modules/admin/admin.routes.js";
import authRoutes from "../modules/auth/auth.routes.js";
import branchAdminRoutes from "../modules/branch_admin/branch_admin.routes.js";
import filesRoutes from "../modules/files/files.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/branch-admin", branchAdminRoutes);
router.use("/admin", adminRoutes);
router.use("/files", filesRoutes);

export default router;
