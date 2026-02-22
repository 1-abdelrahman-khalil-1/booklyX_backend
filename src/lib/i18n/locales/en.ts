/**
 * English translations — the default/fallback language.
 *
 * Every key from `M` (in keys.ts) must have an entry here.
 * If you add a new key but forget the translation, TypeScript
 * will show a compile error because `Messages` requires all keys.
 *
 * ### Interpolation
 * Use `{{placeholder}}` for dynamic values. At runtime the `t()` function
 * replaces `{{values}}` with the actual string you pass in `params`.
 * Example key:  PLATFORM_MUST_BE_ONE_OF → "Platform must be one of: {{values}}."
 * Example call: t(M.PLATFORM_MUST_BE_ONE_OF, lang, { values: "APP, WEB" })
 */
import type { Messages } from "../keys.js";

const en: Messages = {
  USER_NOT_FOUND: "No user found.",
  INVALID_CREDENTIALS: "Invalid email or password.",
  PLATFORM_ACCESS_DENIED:
    "This role is not allowed to access from this platform.",
  INACTIVE_USER: "User account is not active.",
  TOKEN_EXPIRED: "Token has expired.",
  INVALID_TOKEN: "Invalid token.",
  INVALID_CODE: "Invalid code.",

  EMAIL_REQUIRED: "Email is required.",
  EMAIL_INVALID: "Email must be a valid email address.",
  PASSWORD_REQUIRED: "Password is required.",
  PASSWORD_MIN_LENGTH: "Password must be at least 8 characters long.",
  PHONE_REQUIRED: "Phone is required.",
  PHONE_INVALID: "Phone must be a valid 10-digit number.",
  PHONE_MUST_BE_STRING: "Phone must be a string.",
  PLATFORM_HEADER_REQUIRED: "Platform header is required.",
  PLATFORM_MUST_BE_ONE_OF: "Platform must be one of: {{values}}.",
  ROLE_REQUIRED: "Role is required.",
  ROLE_MUST_BE_ONE_OF: "Role must be one of: {{values}}.",
  DUPLICATE_EMAIL: "A user with this email already exists.",
  DUPLICATE_PHONE: "A user with this phone number already exists.",
  DUPLICATE_ACCOUNT: "Account already exists.",
  EMAIL_ALREADY_VERIFIED: "Email is already verified.",
  PHONE_ALREADY_VERIFIED: "Phone is already verified.",
  VERIFICATION_EMAIL_SENT: "Verification email sent.",
  EMAIL_VERIFIED_SUCCESS: "Email verified successfully.",
  VERIFICATION_CODE_SENT: "Verification code sent.",
  PHONE_VERIFIED_SUCCESS: "Phone verified successfully.",
  PASSWORD_RESET_EMAIL_SENT: "Password reset code sent to your email.",
  PASSWORD_RESET_OTP_VERIFIED: "Code verified. You can now reset your password.",
  PASSWORD_RESET_SUCCESS: "Password reset successfully.",
  MAX_ATTEMPTS_EXCEEDED: "Too many failed attempts. Please request a new code.",
  LOGIN_SUCCESS: "Login successful.",
  REGISTER_SUCCESS: "Registration successful.",
  USER_CREATED: "User created successfully.",
  AUTH_REQUIRED: "Authentication required.",
  AUTH_TOKEN_REQUIRED: "Authentication token is required.",
  TOKEN_PLATFORM_MISMATCH: "Token not valid for this platform.",
  INVALID_OR_EXPIRED_TOKEN: "Invalid or expired token.",
  FORBIDDEN: "You do not have permission to access this resource.",
  INTERNAL_SERVER_ERROR: "Internal server error.",
};

export default en;
