import jwt from "jsonwebtoken";
import { VerificationType } from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import { InvalidTokenError, UserNotFound } from "../errors.js";
import * as helpers from "../helpers.js";

const PASSWORD_RESET_PURPOSE = "PASSWORD_RESET";

export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  const code = await helpers.createVerificationCode(user.id, VerificationType.PASSWORD_RESET);
  await import("../../../lib/email.js").then(m=>m.sendPasswordResetEmail(email, code));
}

export async function verifyPasswordReset(email, code) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new UserNotFound();
  await helpers.consumeVerificationCode(user.id, VerificationType.PASSWORD_RESET, code);
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error("JWT_SECRET is not set.");
  const resetToken = jwt.sign({ sub: user.id, purpose: PASSWORD_RESET_PURPOSE }, jwtSecret, { expiresIn: "15m" });
  return { resetToken };
}

export async function resetPassword(resetToken, newPassword) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error("JWT_SECRET is not set.");
  let payload;
  try { payload = jwt.verify(resetToken, jwtSecret); } catch { throw new InvalidTokenError(); }
  if (payload.purpose !== PASSWORD_RESET_PURPOSE) throw new InvalidTokenError();
  const hashedPassword = await import("bcrypt").then(m=>m.default.hash(newPassword,10));
  await prisma.user.update({ where: { id: payload.sub }, data: { password: hashedPassword } });
}

export default {};
