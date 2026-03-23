/**
 * English translations — the default/fallback language.
 *
 * Every key from `tr` (in keys.ts) must have an entry here.
 * If you add a new key but forget the translation, JavaScript
 * won't catch it at compile time, so be careful.
 *
 * ### Interpolation
 * Use `{{placeholder}}` for dynamic values. At runtime the `t()` function
 * replaces `{{values}}` with the actual string you pass in `params`.
 * Example key:  PLATFORM_MUST_BE_ONE_OF → "Platform must be one of: {{values}}."
 * Example call: t(M.PLATFORM_MUST_BE_ONE_OF, lang, { values: "APP, WEB" })
 */

const en = {
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
  OTP_SENT_SUCCESS: "Verification code sent.",
  OTP_VERIFIED_SUCCESS: "Code verified successfully.",
  OTP_REQUIRED: "Code is required.",
  OTP_INVALID: "Invalid code.",
  OTP_EXPIRED: "Code has expired.",
  OTP_MAX_ATTEMPTS_EXCEEDED: "Too many failed attempts. Please request a new code.",
  TOKEN_REQUIRED: "Token is required.",
  EMAIL_NOT_VERIFIED: "Your email is not verified. Please verify your email before logging in.",
  PHONE_NOT_VERIFIED: "Your phone number is not verified. Please verify your phone number before logging in.",
  NAME_REQUIRED: "Name is required.",

  // Branch Admin Onboarding
  APPLICATION_NOT_FOUND: "Application not found.",
  APPLICATION_ALREADY_EXISTS: "An application with this email or phone already exists.",
  APPLICATION_SUBMITTED: "Your application has been submitted successfully. Please verify your email.",
  APPLICATION_UNDER_REVIEW: "Your application has been verified and is now under review by our team.",
  APPLICATION_APPROVED: "Application approved successfully.",
  APPLICATION_REJECTED: "Application rejected.",
  APPLICATION_IS_UNDER_REVIEW: "This application is under review.",
  APPLICATION_IS_NOT_PENDING_APPROVAL: "This application is not pending approval.",

  // Business Validation
  BUSINESS_NAME_REQUIRED: "Business name is required.",
  CATEGORY_REQUIRED: "Business category is required.",
  CATEGORY_MUST_BE_ONE_OF: "Category must be one of: {{values}}.",
  CITY_REQUIRED: "City is required.",
  ADDRESS_REQUIRED: "Address is required.",
  LATITUDE_REQUIRED: "Latitude is required.",
  LONGITUDE_REQUIRED: "Longitude is required.",
  REJECTION_REASON_REQUIRED: "Rejection reason is required for rejection.",
  DOCUMENT_TYPE_REQUIRED: "Document type is required.",
  DOCUMENT_TYPE_MUST_BE_ONE_OF: "Document type must be one of: {{values}}.",
  FILE_URL_REQUIRED: "File URL is required.",
  TAX_ID_REQUIRED: "Tax ID is required.",
  COMMERCIAL_REGISTER_NUMBER_REQUIRED: "Commercial register number is required.",
  DESCRIPTION_REQUIRED: "Description is required.",
  DISTRICT_REQUIRED: "District is required.",
  APPLICATION_RETRIEVED_SUCCESSFULLY: "Application retrieved successfully.",
  STAFF_CREATED: "Staff created successfully.",
  SERVICE_CREATED: "Service created successfully and sent for admin approval.",
  SERVICES_RETRIEVED_SUCCESSFULLY: "Services retrieved successfully.",
  SERVICE_APPROVED: "Service approved successfully.",
  SERVICE_REJECTED: "Service rejected.",
  SERVICE_NOT_FOUND: "Service not found.",
  SERVICE_IS_NOT_PENDING_APPROVAL: "This service is not pending approval.",
  SERVICE_UPDATED: "Service updated successfully.",
  SERVICE_DELETED: "Service deleted successfully.",
  SERVICE_CANNOT_EDIT_AFTER_APPROVAL: "Services can only be edited while pending approval.",
  SERVICE_CANNOT_DELETE_AFTER_APPROVAL: "Services can only be deleted while pending approval.",
  CATEGORY_ADDED_SUCCESSFULLY: "Category added successfully.",
  CATEGORIES_RETRIEVED_SUCCESSFULLY: "Categories retrieved successfully.",
};

export default en;
