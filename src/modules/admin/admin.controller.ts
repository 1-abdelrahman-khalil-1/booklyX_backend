import { Request, Response } from "express";
import { ApplicationStatus } from "../../generated/prisma/client.js";
import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { errorResponse, successResponse } from "../../utils/response.js";
import {
    ApplicationNotFound,
    ApplicationNotPendingError,
    approveApplication,
    getApplicationDetail,
    listApplications,
    rejectApplication,
} from "./admin.service.js";

// ─── List Applications Handler ──────────────────────────────────────────────

export async function listApplicationsHandler(req: Request, res: Response): Promise<void> {
    const lang = getLanguage(req);
    try {
        const status = req.query.status as ApplicationStatus | undefined;
        const result = await listApplications(status);
        successResponse(res, 200, "Applications retrieved successfully", result);
    } catch (error) {
        console.error("Unexpected error in listApplicationsHandler:", error);
        errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, lang));
    }
}

// ─── Get Application Detail Handler ──────────────────────────────────────────

export async function getApplicationDetailHandler(req: Request, res: Response): Promise<void> {
    const lang = getLanguage(req);
    try {
        const id = parseInt(req.params.id as string);
        const result = await getApplicationDetail(id);
        successResponse(res, 200, "Application retrieved successfully", result);
    } catch (error) {
        if (error instanceof ApplicationNotFound)
            return void errorResponse(res, 404, t(error.message, lang));
        console.error("Unexpected error in getApplicationDetailHandler:", error);
        errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, lang));
    }
}

// ─── Approve Application Handler ─────────────────────────────────────────────

export async function approveApplicationHandler(req: Request, res: Response): Promise<void> {
    const lang = getLanguage(req);
    try {
        const id = parseInt(req.params.id as string);
        const result = await approveApplication(id);
        successResponse(res, 200, t(result.message, lang), result.user);
    } catch (error) {
        if (error instanceof ApplicationNotFound)
            return void errorResponse(res, 404, t(error.message, lang));
        if (error instanceof ApplicationNotPendingError)
            return void errorResponse(res, 400, t(error.message, lang));
        console.error("Unexpected error in approveApplicationHandler:", error);
        errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, lang));
    }
}

// ─── Reject Application Handler ──────────────────────────────────────────────

export async function rejectApplicationHandler(req: Request, res: Response): Promise<void> {
    const lang = getLanguage(req);
    try {
        const id = parseInt(req.params.id as string);
        const { reason } = req.body;
        if (!reason) {
            return void errorResponse(res, 400, t(tr.REJECTION_REASON_REQUIRED, lang));
        }
        const result = await rejectApplication(id, reason);
        successResponse(res, 200, t(result.message, lang));
    } catch (error) {
        if (error instanceof ApplicationNotFound)
            return void errorResponse(res, 404, t(error.message, lang));
        if (error instanceof ApplicationNotPendingError)
            return void errorResponse(res, 400, t(error.message, lang));
        console.error("Unexpected error in rejectApplicationHandler:", error);
        errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, lang));
    }
}
