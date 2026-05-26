import {
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_NAME,
  SUPER_ADMIN_PASSWORD,
  SUPER_ADMIN_PHONE,
} from "../config/constants.js";
import { getSeedClients } from "../generators/clients.generator.js";
import { getSeedInitialStaffUsers } from "../generators/staff.generator.js";
import { hashPassword } from "../helpers/bcrypt.js";
import { prisma } from "../helpers/prisma.js";
import { Role, UserStatus } from "../../src/generated/prisma/client.js";

export async function seedUsers() {
  const superAdminPasswordHash = await hashPassword(SUPER_ADMIN_PASSWORD);

  const superAdmin = await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: {
      name: SUPER_ADMIN_NAME,
      password: superAdminPasswordHash,
      phone: SUPER_ADMIN_PHONE,
      role: Role.super_admin,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      phoneVerified: true,
    },
    create: {
      name: SUPER_ADMIN_NAME,
      email: SUPER_ADMIN_EMAIL,
      password: superAdminPasswordHash,
      phone: SUPER_ADMIN_PHONE,
      role: Role.super_admin,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const seedClients = getSeedClients();
  const seedInitialStaffUsers = getSeedInitialStaffUsers();

  for (const user of seedClients) {
    const userPasswordHash = await hashPassword(user.password);
    const seededUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        password: userPasswordHash,
        phone: user.phone,
        role: user.role,
        status: user.status,
        emailVerified: true,
        phoneVerified: true,
      },
      create: {
        name: user.name,
        email: user.email,
        password: userPasswordHash,
        phone: user.phone,
        role: user.role,
        status: user.status,
        emailVerified: true,
        phoneVerified: true,
      },
    });

    await prisma.client.upsert({
      where: { userId: seededUser.id },
      update: {},
      create: { userId: seededUser.id },
    });
  }

  for (const staff of seedInitialStaffUsers) {
    const staffPasswordHash = await hashPassword(staff.password);
    await prisma.user.upsert({
      where: { email: staff.email },
      update: {
        name: staff.name,
        password: staffPasswordHash,
        phone: staff.phone,
        role: staff.role,
        status: staff.status,
        emailVerified: true,
        phoneVerified: true,
      },
      create: {
        name: staff.name,
        email: staff.email,
        password: staffPasswordHash,
        phone: staff.phone,
        role: staff.role,
        status: staff.status,
        emailVerified: true,
        phoneVerified: true,
      },
    });
  }

  return {
    superAdmin,
    seedClients,
    seedInitialStaffUsers,
  };
}
