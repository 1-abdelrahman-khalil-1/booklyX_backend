import dayjs from "dayjs";
import { prisma } from "../helpers/prisma.js";
import { hashPassword } from "../helpers/bcrypt.js";
import { VerificationType } from "../../src/generated/prisma/client.js";

function buildUserVerificationSeeds(userIds) {
  return userIds.flatMap((userId, index) => [
    {
      userId,
      type: VerificationType.EMAIL,
      code: `EMAIL-${String(index + 1).padStart(2, "0")}-123456`,
    },
    {
      userId,
      type: VerificationType.PHONE,
      code: `PHONE-${String(index + 1).padStart(2, "0")}-654321`,
    },
    {
      userId,
      type: VerificationType.PASSWORD_RESET,
      code: `RESET-${String(index + 1).padStart(2, "0")}-999999`,
    },
  ]);
}

function buildRefreshTokenSeed(userId, index) {
  return {
    userId,
    token: `refresh-token-${index + 1}`,
    loginSequence: index + 1,
  };
}

export async function seedVerification(verificationEmails) {
  const verificationTargets = await prisma.user.findMany({
    where: { email: { in: verificationEmails } },
    orderBy: { id: "asc" },
  });

  if (verificationTargets.length === 0) {
    return;
  }

  const verificationSeeds = buildUserVerificationSeeds(
    verificationTargets.map((user) => user.id),
  );

  await prisma.verificationCode.deleteMany({
    where: {
      userId: {
        in: verificationTargets.map((user) => user.id),
      },
    },
  });

  for (const verificationSeed of verificationSeeds) {
    const codeHash = await hashPassword(verificationSeed.code);
    await prisma.verificationCode.create({
      data: {
        userId: verificationSeed.userId,
        type: verificationSeed.type,
        codeHash,
        expiresAt: dayjs().add(2, "day").toDate(),
        used: false,
        attempts: 0,
      },
    });
  }

  await prisma.refreshToken.deleteMany({
    where: {
      userId: {
        in: verificationTargets.slice(0, 3).map((user) => user.id),
      },
    },
  });

  for (const [index, user] of verificationTargets.slice(0, 3).entries()) {
    const refreshTokenSeed = buildRefreshTokenSeed(user.id, index);
    const tokenHash = await hashPassword(refreshTokenSeed.token);

    await prisma.refreshToken.create({
      data: {
        userId: refreshTokenSeed.userId,
        tokenHash,
        expiresAt: dayjs().add(30, "day").toDate(),
        loginSequence: refreshTokenSeed.loginSequence,
      },
    });
  }
}
