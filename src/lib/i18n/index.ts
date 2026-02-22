/**
 * i18n — Internationalization module
 *
 * ### What this module does
 * It lets the API return error/success messages in the language the client
 * requests. The client sends an `Accept-Language` header (e.g. `ar` or `en`)
 * and the backend picks the matching translation.
 *
 * ### How language is detected (priority order)
 * 1. `Accept-Language` header — standard HTTP header (e.g. "ar", "en-US").
 * 2. Falls back to `"en"` (English) if the header is missing or unsupported.
 *
 * ### How to use in a controller
 * ```ts
 * import { t, getLanguage } from "../../lib/i18n/index.js";
 * import { M } from "../../lib/i18n/keys.js";
 *
 * const lang = getLanguage(req);
 * res.status(200).json({ message: t(M.EMAIL_VERIFIED_SUCCESS, lang) });
 * ```
 *
 * ### Interpolation (dynamic values)
 * Some messages contain `{{placeholders}}`. Pass a `params` object:
 * ```ts
 * t(M.PLATFORM_MUST_BE_ONE_OF, lang, { values: "APP, WEB" })
 * // English → "Platform must be one of: APP, WEB."
 * // Arabic  → "يجب أن تكون المنصة واحدة من: APP, WEB."
 * ```
 */
import { Request } from "express";
import ar from "./locales/ar.js";
import en from "./locales/en.js";

// Re-export keys so consumers can do: import { M, t, getLanguage } from "…/i18n/index.js";
export { tr, type MessageKey } from "./keys.js";

/** Languages currently supported by the backend. */
export type SupportedLanguage = "en" | "ar";

/** Map of language code → translated messages object. */
const locales: Record<string, Record<string, string>> = { en, ar };

/**
 * Detect the preferred language from the incoming request.
 *
 * Reads the standard `Accept-Language` HTTP header.
 * If the header starts with a supported language code, that language is used;
 * otherwise falls back to English.
 *
 * @example
 * // Request header: Accept-Language: ar
 * getLanguage(req) // → "ar"
 *
 * // Request header: Accept-Language: fr
 * getLanguage(req) // → "en" (unsupported → fallback)
 */
export function getLanguage(req: Request): SupportedLanguage {
  const header = req.headers["accept-language"];

  if (typeof header === "string" && header.toLowerCase().startsWith("ar")) {
    return "ar";
  }

  return "en";
}

/**
 * Translate a message key into the requested language.
 *
 * @param key    - A message key (e.g. `M.EMAIL_REQUIRED` → `"EMAIL_REQUIRED"`).
 * @param lang   - Target language (default `"en"`).
 * @param params - Optional dynamic values to interpolate into `{{placeholders}}`.
 * @returns The translated string — or the raw key if no translation is found.
 *
 * ### Fallback chain
 * 1. Look up `key` in the requested locale.
 * 2. If missing, look up `key` in English (always the most complete).
 * 3. If still missing, return the raw key string so it's visible in logs.
 */
export function t(
  key: string,
  lang: SupportedLanguage = "en",
  params?: Record<string, string>,
): string {
  const locale = locales[lang] ?? locales.en;
  let message = locale[key] ?? locales.en[key] ?? key;

  // Replace {{placeholder}} tokens with actual values
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      message = message.replace(`{{${k}}}`, v);
    }
  }

  return message;
}
