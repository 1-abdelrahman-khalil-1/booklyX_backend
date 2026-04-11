import { Router } from "express";
import adminRoutes from "../modules/admin/admin.routes.js";
import authRoutes from "../modules/auth/auth.routes.js";
import branchAdminRoutes from "../modules/branch_admin/branch_admin.routes.js";
<<<<<<< Updated upstream
import filesRoutes from "../modules/files/files.routes.js";
=======
import reviewRoutes from "../modules/reviews/reviews.routes.js";
>>>>>>> Stashed changes

const router = Router();

router.use("/auth", authRoutes);
router.use("/branch-admin", branchAdminRoutes);
router.use("/admin", adminRoutes);
<<<<<<< Updated upstream
router.use("/files", filesRoutes);
=======
router.use("/reviews", reviewRoutes);
>>>>>>> Stashed changes

export default router;
