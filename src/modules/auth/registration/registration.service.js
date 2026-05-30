import { Prisma, Role, VerificationType } from "../../../generated/prisma/client.js";
import { tr } from "../../../lib/i18n/index.js";
import prisma from "../../../lib/prisma.js";
import { isPlatformAllowedForRole } from "../auth.permissions.js";
import {
    AuthValidationError,
    DuplicateAccountError,
    UserNotFound,
} from "../errors.js";
import * as helpers from "../helpers.js";

export async function register(data, platform) {
  const { name, email, password, phone } = data;
  if (!isPlatformAllowedForRole(Role.client, platform)) throw new AuthValidationError(tr.PLATFORM_ACCESS_DENIED || "PLATFORM_ACCESS_DENIED");

  const existingUser = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } });
  if (existingUser) {
    if (existingUser.email === email) throw new DuplicateAccountError(tr.DUPLICATE_EMAIL);
    if (existingUser.phone === phone) throw new DuplicateAccountError(tr.DUPLICATE_PHONE);
    throw new DuplicateAccountError(tr.DUPLICATE_ACCOUNT);
  }

  const hashedPassword = await helpers.Prisma ? await import("bcrypt").then(m=>m.default.hash(password,10)) : null;

  let user;
  try {
    user = await prisma.user.create({ data: { name, email, password: await import("bcrypt").then(m=>m.default.hash(password,10)), phone, role: Role.client, status: "ACTIVE", client: { create: {} } } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = error.meta?.target;
      if (Array.isArray(target) && target.includes("email")) throw new DuplicateAccountError(tr.DUPLICATE_EMAIL);
      if (Array.isArray(target) && target.includes("phone")) throw new DuplicateAccountError(tr.DUPLICATE_PHONE);
      throw new DuplicateAccountError(tr.DUPLICATE_ACCOUNT);
    }
    throw error;
  }

  const code = await helpers.createVerificationCode(user.id, VerificationType.EMAIL);
  await import("../../../lib/email.js").then(m=>m.sendEmailVerification(email, code));
}

export async function verifyEmail(email, code) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new UserNotFound();
  if (user.emailVerified) throw new AuthValidationError(tr.EMAIL_ALREADY_VERIFIED);
  await helpers.consumeVerificationCode(user.id, VerificationType.EMAIL, code);
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  const phoneCode = await helpers.createVerificationCode(user.id, VerificationType.PHONE);
  await import("../../../lib/email.js").then(m=>m.sendPhoneVerificationCode(user.email, phoneCode));
}

export async function resendCode(email, phone, type) {
  let where = {};
  if (email) where.email = email;
  if (phone) where.phone = phone;
  const user = await prisma.user.findFirst({ where });
  if (!user) throw new UserNotFound();
  if (type === VerificationType.EMAIL && user.emailVerified) throw new AuthValidationError(tr.EMAIL_ALREADY_VERIFIED);
  if (type === VerificationType.PHONE && user.phoneVerified) throw new AuthValidationError(tr.PHONE_ALREADY_VERIFIED);
  const newCode = await helpers.createVerificationCode(user.id, type);
  if (type === VerificationType.EMAIL) { await import("../../../lib/email.js").then(m=>m.sendEmailVerification(user.email, newCode)); }
  else if (type === VerificationType.PHONE) { await import("../../../lib/email.js").then(m=>m.sendPhoneVerificationCode(user.email, newCode)); }
  else if (type === VerificationType.PASSWORD_RESET) { await import("../../../lib/email.js").then(m=>m.sendPasswordResetEmail(user.email, newCode)); }
}

export default {};
