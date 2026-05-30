import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import {
    activateSubscriptionHandler,
    cancelSubscriptionHandler,
    changeSubscriptionPlanHandler,
    renewSubscriptionHandler,
} from "./subscription.controller.js";

const subscriptionRouter = Router();

subscriptionRouter.post(
  "/activate",
  authenticate,
  authorize(Role.branch_admin),
  activateSubscriptionHandler,
);
subscriptionRouter.post("/renew", authenticate, authorize(Role.branch_admin), renewSubscriptionHandler);
subscriptionRouter.put("/:id", authenticate, authorize(Role.branch_admin), changeSubscriptionPlanHandler);
subscriptionRouter.post("/cancel", authenticate, authorize(Role.branch_admin), cancelSubscriptionHandler);

export default subscriptionRouter;