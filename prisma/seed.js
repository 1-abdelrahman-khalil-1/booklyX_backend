import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import {
  ApplicationStatus,
  BusinessCategory,
  PrismaClient,
  Role,
  UserStatus,
} from "../src/generated/prisma/client.js";

const SUPER_ADMIN_EMAIL = "admin@booklyx.com";
const SUPER_ADMIN_PASSWORD = "12345678";
const SUPER_ADMIN_PHONE = "01000000000";
const SUPER_ADMIN_NAME = "Super Admin";
const SALT_ROUNDS = 10;

const SEED_USERS = [
  {
    name: "John Doe",
    email: "john@booklyx.com",
    password: "12345678",
    phone: "01000000001",
    role: Role.client,
    status: UserStatus.ACTIVE,
  },
  {
    name: "Sara Ali",
    email: "sara@booklyx.com",
    password: "12345678",
    phone: "01000000002",
    role: Role.client,
    status: UserStatus.ACTIVE,
  },
  {
    name: "Abdo Khalil",
    email: "khalil@booklyx.com",
    password: "12345678",
    phone: "01000000003",
    role: Role.client,
    status: UserStatus.ACTIVE,
  },
];

const SEED_BRANCH_APPLICATIONS = [
  {
    ownerName: "Mona Hassan",
    email: "mona.branch@booklyx.com",
    phone: "01000000011",
    password: "12345678",
    businessName: "Mona Beauty Lounge",
    category: BusinessCategory.SPA,
    description: "Premium beauty and skincare services.",
    commercialRegisterNumber: "CR-2026-001",
    taxId: "TAX-2026-001",
    city: "Cairo",
    district: "Nasr City",
    address: "12 Makram Ebeid Street",
    latitude: 30.0626,
    longitude: 31.3368,
    status: ApplicationStatus.PENDING,
  },
  {
    ownerName: "Ahmed Samir",
    email: "ahmed.branch@booklyx.com",
    phone: "01000000012",
    password: "12345678",
    businessName: "Samir Health Clinic",
    category: BusinessCategory.CLINIC,
    description: "General medicine and dermatology care.",
    commercialRegisterNumber: "CR-2026-002",
    taxId: "TAX-2026-002",
    city: "Giza",
    district: "Dokki",
    address: "8 Tahrir Street",
    latitude: 30.0384,
    longitude: 31.2109,
    status: ApplicationStatus.PENDING,
  },
];

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting database seed...\n");

  const superAdminPasswordHash = await bcrypt.hash(
    SUPER_ADMIN_PASSWORD,
    SALT_ROUNDS,
  );

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

  console.log("✅ Super admin ensured successfully!\n");
  console.log("📋 Credentials:");
  console.log(`   Email:    ${SUPER_ADMIN_EMAIL}`);
  console.log(`   Password: ${SUPER_ADMIN_PASSWORD}`);
  console.log(`   Phone:    ${SUPER_ADMIN_PHONE}`);
  console.log(`   Role:     ${superAdmin.role}`);
  console.log(`   ID:       ${superAdmin.id}\n`);

  for (const user of SEED_USERS) {
    const userPasswordHash = await bcrypt.hash(user.password, SALT_ROUNDS);
    await prisma.user.upsert({
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

    console.log(`👤 Seeded user: ${user.email} (${user.role})`);
  }

  const branchAdminTableState = await prisma.$queryRaw`
        SELECT to_regclass('"public"."BranchAdmin"')::text AS table_name
    `;

  const branchAdminTableExists = !!branchAdminTableState[0]?.table_name;

  if (!branchAdminTableExists) {
    console.log(
      "⚠️  Branch admin table is missing. Skipping branch admin pending applications.",
    );
    console.log(
      "   Run migrations first, then re-run seed to insert pending branch admin records.\n",
    );
    return;
  }

  for (const application of SEED_BRANCH_APPLICATIONS) {
    const ownerPasswordHash = await bcrypt.hash(
      application.password,
      SALT_ROUNDS,
    );

    const existingApplication = await prisma.branchAdmin.findFirst({
      where: {
        email: application.email,
        phone: application.phone,
      },
    });

    if (existingApplication) {
      await prisma.branchAdmin.update({
        where: { id: existingApplication.id },
        data: {
          ownerName: application.ownerName,
          passwordHash: ownerPasswordHash,
          businessName: application.businessName,
          category: application.category,
          description: application.description,
          commercialRegisterNumber: application.commercialRegisterNumber,
          taxId: application.taxId,
          city: application.city,
          district: application.district,
          address: application.address,
          latitude: application.latitude,
          longitude: application.longitude,
          status: application.status,
          emailVerified: true,
          phoneVerified: true,
          rejectionReason: null,
          userId: null,
        },
      });
    } else {
      await prisma.branchAdmin.create({
        data: {
          ownerName: application.ownerName,
          email: application.email,
          phone: application.phone,
          passwordHash: ownerPasswordHash,
          businessName: application.businessName,
          category: application.category,
          description: application.description,
          commercialRegisterNumber: application.commercialRegisterNumber,
          taxId: application.taxId,
          city: application.city,
          district: application.district,
          address: application.address,
          latitude: application.latitude,
          longitude: application.longitude,
          status: application.status,
          emailVerified: true,
          phoneVerified: true,
        },
      });
    }

    console.log(
      `🏢 Seeded branch application: ${application.businessName} (${application.status})`,
    );
  }

  console.log(
    "\n🔐 Use seeded credentials to login as users/admin when testing.",
  );
  console.log(
    "⏳ Branch applications are seeded in PENDING_APPROVAL (under review) until admin approval.\n",
  );
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
