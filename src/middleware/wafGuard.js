import crypto from "node:crypto";

const REPLAY_WINDOW_MS = 30000;

export function wafGuard(req, res, next) {
    const secret = process.env.WAF_SHARED_SECRET;

    if (!secret) {
        console.error("WAF_SHARED_SECRET is missing.");
        return res.status(500).json({
            message: "Server configuration error",
        });
    }

    const signature = req.headers["x-waf-signature"];
    const timestamp = req.headers["x-waf-timestamp"];
    const clientIp = req.headers["x-waf-client-ip"];

    console.log({
        signature,
        timestamp,
        clientIp,
    });
    if ((!signature || !timestamp || !clientIp) && process.env.NODE_ENV === "production") {
        return res.status(401).json({
            message: "Unauthorized. Requests must pass through WAF.",
        });
    }
    next();
}