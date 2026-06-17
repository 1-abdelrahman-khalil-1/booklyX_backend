import multer from "multer";
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
            t(err.message, lang, err.params) || err.message,
            err.params,
            err.data
        );
    }

    if (err instanceof ZodError) {
        const firstIssue = err.issues[0];
        let message = firstIssue?.message ?? "Invalid input";
        let params = null;

        if (firstIssue && (firstIssue.code === "invalid_enum_value" || firstIssue.code === "invalid_value")) {
            message = tr.INVALID_ENUM_VALUE;
            const options = firstIssue.options ?? firstIssue.values;
            params = {
                values: Array.isArray(options) ? options.join(", ") : "",
            };
        }

        return void errorResponse(
            res,
            400,
            t(message, lang, params) || message,
            params
        );
    }

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return void errorResponse(res, 400, t(tr.FILE_TOO_LARGE, lang));
    }

    console.error("Unhandled error:", err);
    return void errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, lang));
};
