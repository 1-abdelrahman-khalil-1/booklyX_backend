import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { requireActiveBranchSubscription } from "../../../middleware/branchAdminSubscription.js";
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

subscriptionRouter.use(authenticate, authorize(Role.branch_admin), requireActiveBranchSubscription);

subscriptionRouter.post("/renew", renewSubscriptionHandler);
subscriptionRouter.put("/:id", changeSubscriptionPlanHandler);
subscriptionRouter.post("/cancel", cancelSubscriptionHandler);

export default subscriptionRouter;