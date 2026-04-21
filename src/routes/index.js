import { Router } from "express";
import adminRoutes from "../modules/admin/admin.routes.js";
import authRoutes from "../modules/auth/auth.routes.js";
import branchAdminRoutes from "../modules/branch_admin/branch_admin.routes.js";
import filesRoutes from "../modules/files/files.routes.js";
import offersRoutes from "../modules/offers/offers.routes.js";
import reviewRoutes from "../modules/reviews/reviews.routes.js";
import staffRoutes from "../modules/staff/staff.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/branch-admin", branchAdminRoutes);
router.use("/staff", staffRoutes);
router.use("/admin", adminRoutes);
router.use("/files", filesRoutes);
router.use("/reviews", reviewRoutes);
router.use("/offers", offersRoutes);

export default router;
