import { Router } from "express";
import { listPlansHandler } from "./plans.controller.js";

const plansRouter = Router();

plansRouter.get("/", listPlansHandler);

export default plansRouter;
