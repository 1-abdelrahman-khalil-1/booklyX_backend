/**
 * Arabic translations (الترجمة العربية).
 *
 * Same rules as en.ts — every key from `M` must be present.
 * Use `{{placeholder}}` for dynamic values (same placeholders as English).
 */
import type { Messages } from "../keys.js";

const ar: Messages = {
  USER_NOT_FOUND: "لم يتم العثور على المستخدم.",
  INVALID_CREDENTIALS: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  PLATFORM_ACCESS_DENIED: "هذا الدور غير مسموح له بالوصول من هذه المنصة.",
  INACTIVE_USER: "حساب المستخدم غير نشط.",
  TOKEN_EXPIRED: "انتهت صلاحية الرمز.",
  INVALID_TOKEN: "الرمز غير صالح.",
  INVALID_CODE: "الرمز غير صحيح.",
  EMAIL_REQUIRED: "البريد الإلكتروني مطلوب.",
  EMAIL_INVALID: "يجب أن يكون البريد الإلكتروني عنوان بريد صالح.",
  PASSWORD_REQUIRED: "كلمة المرور مطلوبة.",
  PASSWORD_MIN_LENGTH: "يجب أن تكون كلمة المرور 8 أحرف على الأقل.",
  PHONE_REQUIRED: "رقم الهاتف مطلوب.",
  PHONE_INVALID: "يجب أن يكون رقم الهاتف مكونًا من 10 أرقام.",
  PHONE_MUST_BE_STRING: "يجب أن يكون رقم الهاتف نصًا.",
  PLATFORM_HEADER_REQUIRED: "عنوان المنصة مطلوب.",
  PLATFORM_MUST_BE_ONE_OF: "يجب أن تكون المنصة واحدة من: {{values}}.",
  ROLE_REQUIRED: "الدور مطلوب.",
  ROLE_MUST_BE_ONE_OF: "يجب أن يكون الدور واحدًا من: {{values}}.",
  DUPLICATE_EMAIL: "يوجد مستخدم بهذا البريد الإلكتروني بالفعل.",
  DUPLICATE_PHONE: "يوجد مستخدم بهذا الرقم بالفعل.",
  DUPLICATE_ACCOUNT: "الحساب موجود بالفعل.",
  EMAIL_ALREADY_VERIFIED: "البريد الإلكتروني مُفعّل بالفعل.",
  PHONE_ALREADY_VERIFIED: "رقم الهاتف مُفعّل بالفعل.",
  VERIFICATION_EMAIL_SENT: "تم إرسال بريد التحقق.",
  EMAIL_VERIFIED_SUCCESS: "تم التحقق من البريد الإلكتروني بنجاح.",
  VERIFICATION_CODE_SENT: "تم إرسال رمز التحقق.",
  PHONE_VERIFIED_SUCCESS: "تم التحقق من رقم الهاتف بنجاح.",
  PASSWORD_RESET_EMAIL_SENT: "تم إرسال رمز إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.",
  PASSWORD_RESET_OTP_VERIFIED: "تم التحقق من الرمز. يمكنك الآن إعادة تعيين كلمة المرور.",
  PASSWORD_RESET_SUCCESS: "تم إعادة تعيين كلمة المرور بنجاح.",
  MAX_ATTEMPTS_EXCEEDED: "عدد المحاولات تجاوز الحد المسموح. يرجى طلب رمز جديد.",
  LOGIN_SUCCESS: "تم تسجيل الدخول بنجاح.",
  REGISTER_SUCCESS: "تم إنشاء الحساب بنجاح.",
  USER_CREATED: "تم إنشاء المستخدم بنجاح.",
  AUTH_REQUIRED: "المصادقة مطلوبة.",
  AUTH_TOKEN_REQUIRED: "رمز المصادقة مطلوب.",
  TOKEN_PLATFORM_MISMATCH: "الرمز غير صالح لهذه المنصة.",
  INVALID_OR_EXPIRED_TOKEN: "الرمز غير صالح أو منتهي الصلاحية.",
  FORBIDDEN: "ليس لديك صلاحية للوصول إلى هذا المورد.",
  INTERNAL_SERVER_ERROR: "خطأ في الخادم الداخلي.",
};

export default ar;
