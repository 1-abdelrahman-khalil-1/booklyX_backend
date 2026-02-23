import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import { PrismaClient, Role, UserStatus } from "../src/generated/prisma/client.js";

// ─── Seed Configuration ────────────────────────────────────────────────────────

const SUPER_ADMIN_EMAIL = "admin@booklyx.com";
const SUPER_ADMIN_PASSWORD = "12345678";
const SUPER_ADMIN_PHONE = "01000000000";
const SUPER_ADMIN_NAME = "Super Admin";
const SALT_ROUNDS = 10;

// ─── Initialize Prisma Client ──────────────────────────────────────────────────

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

// ─── Seed Function ─────────────────────────────────────────────────────────────

async function main() {
    console.log("🌱 Starting database seed...\n");

    // Check if super admin already exists
    const existingAdmin = await prisma.user.findUnique({
        where: { email: SUPER_ADMIN_EMAIL },
    });

    if (existingAdmin) {
        console.log("✅ Super admin already exists:");
        console.log(`   Email: ${SUPER_ADMIN_EMAIL}`);
        console.log(`   Role: ${existingAdmin.role}`);
        console.log("\n⚠️  Skipping seed (no changes made).\n");
        return;
    }

    // Create super admin
    const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, SALT_ROUNDS);

    const superAdmin = await prisma.user.create({
        data: {
            name: SUPER_ADMIN_NAME,
            email: SUPER_ADMIN_EMAIL,
            password: hashedPassword,
            phone: SUPER_ADMIN_PHONE,
            role: Role.super_admin,
            status: UserStatus.ACTIVE,
            emailVerified: true,
            phoneVerified: true,
        },
    });

    console.log("✅ Super admin created successfully!\n");
    console.log("📋 Credentials:");
    console.log(`   Email:    ${SUPER_ADMIN_EMAIL}`);
    console.log(`   Password: ${SUPER_ADMIN_PASSWORD}`);
    console.log(`   Phone:    ${SUPER_ADMIN_PHONE}`);
    console.log(`   Role:     ${superAdmin.role}`);
    console.log(`   ID:       ${superAdmin.id}\n`);
    console.log("🔐 Use these credentials to login and get an admin token.\n");
}

// ─── Execute Seed ──────────────────────────────────────────────────────────────

main()
    .catch((error) => {
        console.error("❌ Seed failed:");
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
