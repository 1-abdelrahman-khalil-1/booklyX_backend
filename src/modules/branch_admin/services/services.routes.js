import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { imageOnlyUpload } from "../../../middleware/upload.js";
import {
    addServiceCategoryHandler,
    createServiceHandler,
    deleteServiceHandler,
    getMyServiceCategoriesHandler,
    getMyServicesHandler,
    updateServiceHandler,
} from "./services.controller.js";

const servicesRouter = Router();
const serviceUploadField = imageOnlyUpload.fields([{ name: "image", maxCount: 1 }]);

servicesRouter.get("/", authenticate, authorize(Role.branch_admin), getMyServicesHandler);
servicesRouter.post(
  "/",
  authenticate,
  authorize(Role.branch_admin),
  serviceUploadField,
  createServiceHandler,
);
servicesRouter.get(
  "/categories",
  authenticate,
  authorize(Role.branch_admin),
  getMyServiceCategoriesHandler,
);
servicesRouter.post(
  "/categories",
  authenticate,
  authorize(Role.branch_admin),
  addServiceCategoryHandler,
);
servicesRouter.put(
  "/:id",
  authenticate,
  authorize(Role.branch_admin),
  serviceUploadField,
  updateServiceHandler,
);
servicesRouter.delete("/:id", authenticate, authorize(Role.branch_admin), deleteServiceHandler);

export default servicesRouter;