import { ZodError } from "zod";
import { getLanguage, t, tr } from "../lib/i18n/index.js";
import { AppError } from "../utils/AppError.js";
import { errorResponse } from "../utils/response.js";

export const errorHandler = (
    err,
    req,
    res,
    _next
) => {
    const lang = getLanguage(req);

    if (err instanceof AppError) {
        return void errorResponse(
            res,
            err.statusCode,
            t(err.message, lang, err.params) || err.message
        );
    }

    if (err instanceof ZodError) {
        const firstIssue = err.issues[0];
        return void errorResponse(
            res,
            400,
            t(firstIssue.message, lang) || firstIssue.message
        );
    }

    console.error("Unhandled error:", err);
    return void errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, lang));
};
