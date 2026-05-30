import { Router } from "express";
import { authLimiter } from "../../middleware/rateLimiter.js";
import passwordRouter from "./password/password.routes.js";
import registrationRouter from "./registration/registration.routes.js";
import sessionRouter from "./session/session.routes.js";

const authRouter = Router();

authRouter.use(authLimiter);

authRouter.use("/", registrationRouter);
authRouter.use("/", sessionRouter);
authRouter.use("/", passwordRouter);

export default authRouter;
