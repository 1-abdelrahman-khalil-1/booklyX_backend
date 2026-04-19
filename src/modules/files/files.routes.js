import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { downloadFileHandler } from "./files.controller.js";

const filesRouter = Router();

/**
 * Public endpoint for non-sensitive files (service images, etc.).
 * No authentication required.
 * Internal use only - NOT documented in OpenAPI
 */
filesRouter.get("/public/:filename", downloadFileHandler);

/**
 * Protected endpoint to download sensitive files (documents, certificates).
 * User must be authenticated. Access control enforced at service level.
 */
filesRouter.get("/download/:filename", authenticate, downloadFileHandler);

export default filesRouter;
