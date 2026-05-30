import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Prisma } from "../../generated/prisma/client.js";
import { tr } from "../../lib/i18n/index.js";
import prisma from "../../lib/prisma.js";

const SALT_ROUNDS = 10;
const FIXED_OTP_CODE = process.env.FIXED_OTP_CODE || "333333";
const CODE_EXPIRES_MINUTES = parseInt(process.env.VERIFICATION_CODE_EXPIRES_MINUTES || "10");
const MAX_ATTEMPTS = 5;
const LOGIN_COUNTER_KEY = "login";
const PASSWORD_RESET_PURPOSE = "PASSWORD_RESET";

function generateOtpCode() {
  return FIXED_OTP_CODE;
}

export async function createVerificationCode(userId, type) {
  await prisma.verificationCode.deleteMany({ where: { userId, type, used: false } });
  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + CODE_EXPIRES_MINUTES);
  await prisma.verificationCode.create({ data: { userId, type, codeHash, expiresAt } });
  return code;
}

/** @param {Prisma.TransactionClient} tx */
export async function getNextLoginSequence(tx = prisma) {
  const counter = await tx.systemCounter.upsert({ where: { key: LOGIN_COUNTER_KEY }, create: { key: LOGIN_COUNTER_KEY, value: 1 }, update: { value: { increment: 1 } }, select: { value: true } });
  return counter.value;
}

/** @param {number} userId @param {any} type @param {string} code @param {Prisma.TransactionClient} tx */
export async function consumeVerificationCode(userId, type, code, tx = prisma) {
  const record = await tx.verificationCode.findFirst({ where: { userId, type, used: false }, orderBy: { createdAt: "desc" } });
  if (!record) throw new Error(tr.INVALID_TOKEN);
  if (record.attempts >= MAX_ATTEMPTS) throw new Error(tr.MAX_ATTEMPTS_EXCEEDED);
  if (new Date() > record.expiresAt) throw new Error(tr.TOKEN_EXPIRED);
  const isValid = await bcrypt.compare(code, record.codeHash);
  if (!isValid) {
    await tx.verificationCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    throw new Error(tr.INVALID_TOKEN);
  }
  await tx.verificationCode.update({ where: { id: record.id }, data: { used: true } });
}

/** @param {number} userId @param {string} role @param {string} platform @param {number} loginSequence @param {Prisma.TransactionClient} tx */
export async function issueAuthTokens(userId, role, platform, loginSequence, tx = prisma) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error("JWT_SECRET is not set.");
  const accessToken = jwt.sign({ sub: userId, role, platform }, jwtSecret, { expiresIn: "1h" });
  const prefixedAccessToken = `${loginSequence}|${accessToken}`;
  const refreshTokenString = crypto.randomBytes(40).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(refreshTokenString).digest("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await tx.refreshToken.create({ data: { userId, tokenHash, expiresAt, loginSequence } });
  return { token: prefixedAccessToken, refreshToken: refreshTokenString };
}

export function toSafeUser(user) {
  if (!user) return null;
  const { password: _password, ...safeUser } = user;
  if (safeUser.branchAdmin) {
    const { passwordHash: _hash, ...safeBranchAdmin } = safeUser.branchAdmin;
    return { ...safeBranchAdmin, role: user.role };
  }
  return safeUser;
}

export async function ensureClientProfile(user) {
  if (!user || user.role !== "client") return;
  await prisma.client.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
}

export { Prisma };

export default {};
