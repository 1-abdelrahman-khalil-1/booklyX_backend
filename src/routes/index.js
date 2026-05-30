import { Router } from "express";
import adminRoutes from "../modules/admin/admin.routes.js";
import authRoutes from "../modules/auth/auth.routes.js";
import branchAdminRoutes from "../modules/branch_admin/branch_admin.routes.js";
import clientRoutes from "../modules/client/client.routes.js";
import plansRoutes from "../modules/plans/plans.routes.js";
import reviewRoutes from "../modules/reviews/reviews.routes.js";
import staffRoutes from "../modules/staff/staff.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/branch-admin", branchAdminRoutes);
router.use("/staff", staffRoutes);
router.use("/client", clientRoutes);
router.use("/admin", adminRoutes);
router.use("/reviews", reviewRoutes);
router.use("/plans", plansRoutes);

export default router;
