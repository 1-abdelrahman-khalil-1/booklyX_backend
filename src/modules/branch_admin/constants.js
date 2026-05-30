export const SALT_ROUNDS = 10;
export const FIXED_OTP_CODE = process.env.FIXED_OTP_CODE || "333333";
export const CODE_EXPIRES_MINUTES = parseInt(
  process.env.VERIFICATION_CODE_EXPIRES_MINUTES || "10",
  10,
);
export const MAX_ATTEMPTS = 5;
export const DEFAULT_BRANCH_OPEN_TIME = "09:00";
export const DEFAULT_BRANCH_CLOSE_TIME = "17:00";