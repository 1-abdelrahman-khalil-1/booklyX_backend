import rateLimit from "express-rate-limit";
import { getLanguage, t, tr } from "../lib/i18n/index.js";

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const lang = getLanguage(req);
    res.status(429).json({
      status: 429,
      error: true,
      message: t(tr.RATE_LIMIT_GENERAL, lang),
      data: null,
    });
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const lang = getLanguage(req);
    res.status(429).json({
      status: 429,
      error: true,
      message: t(tr.RATE_LIMIT_AUTH, lang),
      data: null,
    });
  },
});
