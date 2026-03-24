import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { downloadFileHandler } from "./files.controller.js";

const filesRouter = Router();

/**
 * Protected endpoint to download uploaded files.
 * User must be authenticated. Access control enforced at service level.
 */
filesRouter.get("/download/:filename", authenticate, downloadFileHandler);

export default filesRouter;
