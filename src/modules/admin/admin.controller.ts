import { Request, Response } from "express";
import { ApplicationStatus } from "../../generated/prisma/client.js";
import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { errorResponse, successResponse } from "../../utils/response.js";
import {
    approveApplication,
    getApplicationDetail,
    listApplications,
    rejectApplication,
} from "./admin.service.js";

// ─── List Applications Handler ──────────────────────────────────────────────

export const listApplicationsHandler = asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as ApplicationStatus | undefined;
    const result = await listApplications(status);
    successResponse(res, 200, "Applications retrieved successfully", result);
});

// ─── Get Application Detail Handler ──────────────────────────────────────────

export const getApplicationDetailHandler = asyncHandler(async (req: Request, res: Response) => {
    const lang = getLanguage(req);
    const id = parseInt(req.params.id as string);
    const result = await getApplicationDetail(id);
    successResponse(res, 200, t(tr.APPLICATION_RETRIEVED_SUCCESSFULLY, lang), result);
});

// ─── Approve Application Handler ─────────────────────────────────────────────

export const approveApplicationHandler = asyncHandler(async (req: Request, res: Response) => {
    const lang = getLanguage(req);
    const id = parseInt(req.params.id as string);
    const result = await approveApplication(id);
    successResponse(res, 200, t(result.message, lang), result.user);
});

// ─── Reject Application Handler ──────────────────────────────────────────────

export const rejectApplicationHandler = asyncHandler(async (req: Request, res: Response) => {
    const lang = getLanguage(req);
    const id = parseInt(req.params.id as string);
    const { reason } = req.body;
    if (!reason) {
        return void errorResponse(res, 400, t(tr.REJECTION_REASON_REQUIRED, lang));
    }
    const result = await rejectApplication(id, reason);
    successResponse(res, 200, t(result.message, lang));
});
