import { Platform } from "../../../generated/prisma/client.js";
import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { loginSchema, platformSchema, validateAuthInput, verifyPhoneSchema } from "../auth.validation.js";
import { login, logout, refresh, verifyPhone } from "./session.service.js";

export const loginHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const platformHeader = req.headers["platform"];
  const data = validateAuthInput(loginSchema, req.body);
  const platform = validateAuthInput(platformSchema, platformHeader);
  const result = await login(data, platform);

  if (platformHeader === Platform.WEB) {
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    const { refreshToken: _refreshToken, ...responseBody } = result;
    return void successResponse(res, 200, t(tr.LOGIN_SUCCESS, lang), responseBody);
  }

  successResponse(res, 200, t(tr.LOGIN_SUCCESS, lang), result);
});

export const refreshHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const platformHeader = req.headers["platform"];
  const platform = validateAuthInput(platformSchema, platformHeader);

  const refreshToken =
    platformHeader === Platform.WEB ? req.cookies.refreshToken : req.body.refreshToken;

  const result = await refresh(refreshToken, platform);

  if (platformHeader === Platform.WEB) {
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    const { refreshToken: _refreshToken, ...responseBody } = result;
    return void successResponse(res, 200, t(tr.TOKEN_REFRESHED_SUCCESSFULLY, lang), responseBody);
  }

  successResponse(res, 200, t(tr.LOGIN_SUCCESS, lang), result);
});

export const logoutHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const platformHeader = req.headers["platform"];
  validateAuthInput(platformSchema, platformHeader);

  const refreshToken =
    platformHeader === Platform.WEB ? req.cookies.refreshToken : req.body.refreshToken;

  await logout(refreshToken);

  if (platformHeader === Platform.WEB) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
  }

  successResponse(res, 200, t(tr.LOGOUT_SUCCESS, lang));
});

export const verifyPhoneHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email, code } = validateAuthInput(verifyPhoneSchema, req.body);
  const platformHeader = req.headers["platform"];
  const platform = validateAuthInput(platformSchema, platformHeader);
  const result = await verifyPhone(email, code, platform);

  if (platformHeader === Platform.WEB) {
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    const { refreshToken: _refreshToken, ...responseBody } = result;
    return void successResponse(res, 200, t(tr.PHONE_VERIFIED_SUCCESS, lang), responseBody);
  }

  successResponse(res, 200, t(tr.PHONE_VERIFIED_SUCCESS, lang), result);
});
