import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import { getLanguage, t, tr } from "./lib/i18n/index.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import branchAdminRoutes from "./modules/branch_admin/branch_admin.routes.js";
import userRoutes from "./modules/users/users.routes.js";
import { errorResponse } from "./utils/response.js";

const app = express();

app.use(express.json());

app.use("/users", userRoutes);
app.use("/auth", authRoutes);
app.use("/branch-admin", branchAdminRoutes);
app.use("/admin", adminRoutes);

/**
 * Global error middleware — catches any unhandled errors thrown inside
 * route handlers. Express identifies this as an error handler because it
 * has 4 parameters (err, req, res, next).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, getLanguage(req)));
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
