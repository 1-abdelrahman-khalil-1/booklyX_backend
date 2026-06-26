import bcrypt from "bcrypt";
import crypto from "crypto";
import { BranchStatus, Role, UserStatus, VerificationType } from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import { isPlatformAllowedForRole } from "../auth.permissions.js";
import {
    AuthValidationError,
    BranchAdminNotApprovedError,
    EmailNotVerifiedError,
    InactiveUserError,
    InvalidCredentialsError,
    InvalidTokenError,
    PhoneNotVerifiedError,
    PlatformAccessDeniedError,
    TokenExpiredError,
    UserNotFound,
} from "../errors.js";
import * as helpers from "../helpers.js";
import { ensureBranchAdminUserAccount } from "../../branch_admin/helpers.js";

function buildLoginUserInclude(role) {
  return {
    branchAdmin: role === Role.branch_admin ? {
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            maxStaff: true,
            maxServices: true,
            loyaltyEnabled: true,
            offersEnabled: true
          }
        }
      }
    } : false,
    client: role === Role.client ? {
      select: {
        profileImageUrl: true,
      }
    } : false,
    staff: role === Role.staff ? {
      select: {
        profileImageUrl: true,
      }
    } : false,
  };
}

export async function login(data, platform) {
  if (!platform) throw new AuthValidationError("INVALID_PLATFORM");
  if (!data || !data.email || !data.password || !data.role) throw new AuthValidationError("INVALID_LOGIN");

  const { email, role, password } = data;
  const userInclude = buildLoginUserInclude(role);

  let user = await prisma.user.findUnique({
    where: { email, role },
    include: userInclude,
  });

  const branchAdminRecord =
    role === Role.branch_admin && (!user || !user.branchAdmin)
      ? await prisma.branchAdmin.findFirst({
        where: { email },
        select: {
          id: true,
          status: true,
          userId: true,
          email: true,
          phone: true,
          passwordHash: true,
        },
      })
      : null;

  if (!user && !branchAdminRecord) throw new UserNotFound();

  const isPasswordMatch = await bcrypt.compare(password, user?.password || branchAdminRecord?.passwordHash);
  if (!isPasswordMatch) throw new InvalidCredentialsError();

  if (role === Role.branch_admin && branchAdminRecord?.status === BranchStatus.APPROVED && (!user || !user.branchAdmin)) {
    await prisma.$transaction(async (tx) => {
      await ensureBranchAdminUserAccount(branchAdminRecord.id,  tx, user?.id);
    });

    user = await prisma.user.findUnique({
      where: { email, role },
      include: userInclude,
    });
  }

  if (!user) throw new BranchAdminNotApprovedError();

  // @ts-ignore
  if (user.status !== UserStatus.ACTIVE) throw new InactiveUserError({ emailVerified: user.emailVerified, phoneVerified: user.phoneVerified });

  if (user.role === Role.branch_admin) {
    if (!user.branchAdmin || user.branchAdmin.status !== BranchStatus.APPROVED) throw new BranchAdminNotApprovedError();
  }

  if (!isPlatformAllowedForRole(user.role, platform)) throw new PlatformAccessDeniedError();

  if (!user.emailVerified) throw new EmailNotVerifiedError(helpers.toSafeUser(user));
  if (!user.phoneVerified) throw new PhoneNotVerifiedError(helpers.toSafeUser(user));

  await helpers.ensureClientProfile(user);

  const loginSequence = await helpers.getNextLoginSequence();
  const tokens = await helpers.issueAuthTokens(user.id, user.role, platform, loginSequence);

  const response = { ...tokens, user: helpers.toSafeUser(user) };

  if (user.role === Role.branch_admin && !user.branchAdmin?.isSubscriptionActive) {
    return { ...response, requiresSubscription: true };
  }

  return response;
}

export async function refresh(refreshToken, platform) {
  if (!refreshToken || typeof refreshToken !== "string") throw new InvalidTokenError();

  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

  const record = await prisma.refreshToken.findUnique({ where: { tokenHash }, select: { id: true, userId: true, expiresAt: true, loginSequence: true } });
  if (!record) throw new InvalidTokenError();
  if (record.expiresAt < new Date()) { await prisma.refreshToken.delete({ where: { id: record.id } }); throw new TokenExpiredError(); }

  const tokens = await prisma.$transaction(async (tx) => {
    await tx.refreshToken.delete({ where: { id: record.id } });
    const user = await tx.user.findUnique({ where: { id: record.userId } });
    if (!user || user.status !== UserStatus.ACTIVE) throw new InactiveUserError();
    if (!isPlatformAllowedForRole(user.role, platform)) throw new InvalidTokenError();
    const generatedTokens = await helpers.issueAuthTokens(user.id, user.role, platform, record.loginSequence, tx);
    return { ...generatedTokens, role: user.role };
  });

  return tokens;
}

export async function logout(refreshToken) {
  if (!refreshToken || typeof refreshToken !== "string") throw new InvalidTokenError();
  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

export async function verifyPhone(email, code, platform) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new UserNotFound();
  if (!user.emailVerified) throw new EmailNotVerifiedError();
  if (user.phoneVerified) throw new AuthValidationError("PHONE_ALREADY_VERIFIED");
  if (!isPlatformAllowedForRole(user.role, platform)) throw new PlatformAccessDeniedError();

  const tokens = await prisma.$transaction(async (tx) => {
    await helpers.consumeVerificationCode(user.id, VerificationType.PHONE, code, tx);
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: { phoneVerified: true },
      include: {
        client: user.role === Role.client ? { select: { profileImageUrl: true } } : false,
        staff: user.role === Role.staff ? { select: { profileImageUrl: true } } : false,
      }
    });
    const loginSequence = await helpers.getNextLoginSequence(tx);
    const generatedTokens = await helpers.issueAuthTokens(updatedUser.id, updatedUser.role, platform, loginSequence, tx);
    return { ...generatedTokens, user: helpers.toSafeUser(updatedUser) };
  });

  return tokens;
}

export default {};
