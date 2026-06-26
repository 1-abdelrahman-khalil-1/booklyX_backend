import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { requireActiveBranchSubscription } from "../../../middleware/branchAdminSubscription.js";
import { imageOnlyUpload } from "../../../middleware/upload.js";
import {
    addServiceCategoryHandler,
    createServiceHandler,
    deleteServiceHandler,
    getMyServiceCategoriesHandler,
    getMyServicesHandler,
    getServiceDetailsHandler,
    updateServiceHandler,
} from "./services.controller.js";

const servicesRouter = Router();
const serviceUploadField = imageOnlyUpload.fields([{ name: "image", maxCount: 1 }]);

servicesRouter.use(authenticate, authorize(Role.branch_admin), requireActiveBranchSubscription);

servicesRouter.get("/", getMyServicesHandler);
servicesRouter.post("/", serviceUploadField, createServiceHandler);
servicesRouter.get("/categories", getMyServiceCategoriesHandler);
servicesRouter.post("/categories", addServiceCategoryHandler);
servicesRouter.get("/:id", getServiceDetailsHandler);
servicesRouter.put("/:id", serviceUploadField, updateServiceHandler);
servicesRouter.delete("/:id", deleteServiceHandler);

export default servicesRouter;