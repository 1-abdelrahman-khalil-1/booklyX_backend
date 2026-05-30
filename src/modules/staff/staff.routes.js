import { Router } from "express";
import profileRouter from "./profile/profile.routes.js";
import scheduleRouter from "./schedule/schedule.routes.js";
import appointmentsRouter from "./appointments/appointments.routes.js";
import incomeRouter from "./income/income.routes.js";
import servicesRouter from "./services/services.routes.js";
import availabilityRouter from "./availability/availability.routes.js";

const staffRouter = Router();

staffRouter.use("/", profileRouter);
staffRouter.use("/", scheduleRouter);
staffRouter.use("/", appointmentsRouter);
staffRouter.use("/", incomeRouter);
staffRouter.use("/", servicesRouter);
staffRouter.use("/", availabilityRouter);

export default staffRouter;
