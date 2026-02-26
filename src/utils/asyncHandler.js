const ANSI_RESET = "\x1b[0m";
const ANSI_ORANGE = "\x1b[38;5;208m";
const ANSI_YELLOW = "\x1b[33m";

export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((err) => {
            const functionName = fn.name || "anonymousHandler";
            const prefix = process.stdout.isTTY
                ? `${(ANSI_YELLOW)}[AsyncError]${ANSI_RESET}`
                : "[AsyncError]";

            console.error(
                `${prefix} ${functionName} -> ${req.method} ${req.originalUrl}`,
                err
            );
            next(err);
        });
    };
};
