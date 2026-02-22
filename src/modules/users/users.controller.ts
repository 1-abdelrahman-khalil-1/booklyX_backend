import { Request, Response } from "express";
import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { errorResponse, successResponse } from "../../utils/response.js";
import {
  createUser,
  DuplicateEmailError,
  ValidationError,
} from "./users.service.js";

export async function createUserHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const lang = getLanguage(req);
  try {
    const user = await createUser(req.body);
    successResponse(res, 201, t(tr.USER_CREATED, lang), user);
  } catch (error) {
    if (error instanceof ValidationError)
      return void errorResponse(res, 400, t(error.message, lang, error.params));
    if (error instanceof DuplicateEmailError)
      return void errorResponse(res, 409, t(error.message, lang));
    console.error("Unexpected error in createUserHandler:", error);
    errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, lang));
  }
}
