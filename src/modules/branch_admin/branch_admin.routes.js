import { Router } from "express";
import analyticsRouter from "./analytics/analytics.routes.js";
import appointmentsRouter from "./appointments/appointments.routes.js";
import financeRouter from "./finance/finance.routes.js";
import offersRouter from "./offers/offers.routes.js";
import profileRouter from "./profile/profile.routes.js";
import registrationRouter from "./registration/registration.routes.js";
import servicesRouter from "./services/services.routes.js";
import staffRouter from "./staff/staff.routes.js";
import subscriptionRouter from "./subscription/subscription.routes.js";

const branchAdminRouter = Router();

branchAdminRouter.use("/", registrationRouter);
branchAdminRouter.use("/", profileRouter);
branchAdminRouter.use("/staff", staffRouter);
branchAdminRouter.use("/services", servicesRouter);
branchAdminRouter.use("/offers", offersRouter);
branchAdminRouter.use("/subscription", subscriptionRouter);
branchAdminRouter.use("/analytics", analyticsRouter);
branchAdminRouter.use("/appointments", appointmentsRouter);
branchAdminRouter.use("/finance", financeRouter);

export default branchAdminRouter;
