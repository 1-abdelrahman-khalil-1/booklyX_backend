import { Router } from "express";
import { getRecentActivitiesHandler } from "./activities.controller.js";

const activitiesRouter = Router();

activitiesRouter.get("/recent-activities", getRecentActivitiesHandler);

export default activitiesRouter;
