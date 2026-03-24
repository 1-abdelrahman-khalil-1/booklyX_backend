import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import {
  ApplicationStatus,
  BusinessCategory,
  PrismaClient,
  Role,
  ServiceApprovalStatus,
  StaffRole,
  UserStatus,
} from "../src/generated/prisma/client.js";

const SUPER_ADMIN_EMAIL = "admin@booklyx.com";
const SUPER_ADMIN_PASSWORD = "12345678";
const SUPER_ADMIN_PHONE = "01000000000";
const SUPER_ADMIN_NAME = "Super Admin";
const SALT_ROUNDS = 10;

const SEED_USERS = [
  {
    name: "Abdo Khalil",
    email: "abdo.khalil@booklyx.com",
    password: "12345678",
    phone: "01000000001",
    role: Role.client,
    status: UserStatus.ACTIVE,
  },
  {
    name: "Mazen Tamer",
    email: "mazen.tamer@booklyx.com",
    password: "12345678",
    phone: "01000000003",
    role: Role.client,
    status: UserStatus.ACTIVE,
  },
];
const SEED_STAFF = [
  {
    name: "Eslam Wael",
    email: "eslam.wael.staff@booklyx.com",
    password: "12345678",
    phone: "01000000021",
    role: Role.staff,
    status: UserStatus.ACTIVE,
  },
  {
    name: "Abdo Badr",
    email: "abdo.badr.staff@booklyx.com",
    password: "12345678",
    phone: "01000000022",
    role: Role.staff,
    status: UserStatus.ACTIVE,
  },
];
const SEED_BRANCH_APPLICATIONS = [
  {
    ownerName: "Mahmoud Ibrahim",
    email: "mahmoud.Ibrahim@booklyx.com",
    phone: "01000000011",
    password: "12345678",
    businessName: "Hassan Beauty Salon",
    category: BusinessCategory.SPA,
    description: "Premium beauty and skincare services.",
    commercialRegisterNumber: "CR-2026-001",
    taxId: "TAX-2026-001",
    city: "Cairo",
    district: "Nasr City",
    address: "12 Makram Ebeid Street",
    latitude: 30.0626,
    longitude: 31.3368,
    status: ApplicationStatus.APPROVED,
  },
  {
    ownerName: "Ahmed Samir",
    email: "ahmed.samir@booklyx.com",
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
    status: ApplicationStatus.APPROVED,
  },
];

// Service Categories & Services per branch
const SEED_SERVICE_CATEGORIES = [
  {
    branchEmail: "mahmoud.Ibrahim@booklyx.com",
    categories: [
      { name: "Hair Care" },
      { name: "Facial Treatments" },
      { name: "Body Spa" },
    ],
  },
  {
    branchEmail: "ahmed.samir@booklyx.com",
    categories: [
      { name: "General Medicine" },
      { name: "Dermatology" },
      { name: "Consultation" },
    ],
  },
];

const SEED_SERVICES = [
  {
    branchEmail: "mahmoud.Ibrahim@booklyx.com",
    categoryName: "Hair Care",
    services: [
      {
        name: "Haircut",
        description: "Professional haircut with styling",
        price: 150,
        durationMinutes: 30,
      },
      {
        name: "Hair Coloring",
        description: "Premium hair coloring service",
        price: 300,
        durationMinutes: 60,
      },
    ],
  },
  {
    branchEmail: "mahmoud.Ibrahim@booklyx.com",
    categoryName: "Facial Treatments",
    services: [
      {
        name: "Facial Massage",
        description: "Relaxing facial massage",
        price: 200,
        durationMinutes: 45,
      },
      {
        name: "Skin Glow Treatment",
        description: "Brightening skin treatment",
        price: 250,
        durationMinutes: 50,
      },
    ],
  },
  {
    branchEmail: "ahmed.samir@booklyx.com",
    categoryName: "General Medicine",
    services: [
      {
        name: "General Checkup",
        description: "Full body general checkup",
        price: 500,
        durationMinutes: 45,
      },
      {
        name: "Blood Test",
        description: "Complete blood analysis",
        price: 300,
        durationMinutes: 15,
      },
    ],
  },
  {
    branchEmail: "ahmed.samir@booklyx.com",
    categoryName: "Dermatology",
    services: [
      {
        name: "Skin Consultation",
        description: "Dermatological consultation",
        price: 400,
        durationMinutes: 30,
      },
      {
        name: "Acne Treatment",
        description: "Advanced acne treatment",
        price: 600,
        durationMinutes: 60,
      },
    ],
  },
];

// Staff mapping to branches
const STAFF_BRANCH_MAPPING = [
  {
    staffEmail: "eslam.wael.staff@booklyx.com",
    branchEmail: "mahmoud.Ibrahim@booklyx.com",
    staffRole: StaffRole.BARBER,
    commissionPercentage: 15,
    
  },
  {
    staffEmail: "abdo.badr.staff@booklyx.com",
    branchEmail: "ahmed.samir@booklyx.com",
    staffRole: StaffRole.DOCTOR,
    commissionPercentage: 20,
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

  console.log("\n");

  for (const staff of SEED_STAFF) {
    const staffPasswordHash = await bcrypt.hash(staff.password, SALT_ROUNDS);
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

    console.log(`👤 Seeded staff: ${staff.email} (${staff.role})`);
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

    // Create or get the branch admin user
    const branchAdminUser = await prisma.user.upsert({
      where: { email: application.email },
      update: {
        name: application.ownerName,
        password: ownerPasswordHash,
        phone: application.phone,
        role: Role.branch_admin,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
      },
      create: {
        name: application.ownerName,
        email: application.email,
        password: ownerPasswordHash,
        phone: application.phone,
        role: Role.branch_admin,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
      },
    });

    // Create or update branch admin application
    const existingApplication = await prisma.branchAdmin.findFirst({
      where: {
        email: application.email,
        phone: application.phone,
      },
    });

    let branchAdmin;
    if (existingApplication) {
      branchAdmin = await prisma.branchAdmin.update({
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
          userId: branchAdminUser.id,
        },
      });
    } else {
      branchAdmin = await prisma.branchAdmin.create({
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
          userId: branchAdminUser.id,
        },
      });
    }

    console.log(
      `🏢 Seeded branch: ${application.businessName} (${application.status}) - Owner: ${branchAdminUser.email}`,
    );

    // Seed Service Categories for this branch
    const categoryMap = SEED_SERVICE_CATEGORIES.find(
      (sc) => sc.branchEmail === application.email,
    );
    if (categoryMap) {
      for (const cat of categoryMap.categories) {
        await prisma.serviceCategory.upsert({
          where: {
            branchId_name: {
              branchId: branchAdmin.id,
              name: cat.name,
            },
          },
          update: {},
          create: {
            branchId: branchAdmin.id,
            name: cat.name,
          },
        });
      }
      console.log(
        `  📂 Created ${categoryMap.categories.length} service categories`,
      );
    }

    // Seed Services for this branch
    const branchServices = SEED_SERVICES.filter(
      (ss) => ss.branchEmail === application.email,
    );
    for (const serviceGroup of branchServices) {
      const category = await prisma.serviceCategory.findFirst({
        where: {
          branchId: branchAdmin.id,
          name: serviceGroup.categoryName,
        },
      });

      if (category) {
        for (const svc of serviceGroup.services) {
          const existingService = await prisma.service.findFirst({
            where: {
              branchId: branchAdmin.id,
              serviceCategoryId: category.id,
              name: svc.name,
            },
          });

          if (existingService) {
            await prisma.service.update({
              where: { id: existingService.id },
              data: {
                description: svc.description,
                price: svc.price,
                durationMinutes: svc.durationMinutes,
                status: ServiceApprovalStatus.APPROVED,
              },
            });
          } else {
            await prisma.service.create({
              data: {
                branchId: branchAdmin.id,
                serviceCategoryId: category.id,
                name: svc.name,
                description: svc.description,
                price: svc.price,
                durationMinutes: svc.durationMinutes,
                status: ServiceApprovalStatus.APPROVED,
              },
            });
          }
        }
      }
    }
  }

  console.log("\n");

  // Link Staff to Branches
  for (const staffMapping of STAFF_BRANCH_MAPPING) {
    const staff = await prisma.user.findUnique({
      where: { email: staffMapping.staffEmail },
    });

    const branch = await prisma.branchAdmin.findFirst({
      where: { email: staffMapping.branchEmail },
    });

    if (staff && branch) {
      const existingStaff = await prisma.staff.findUnique({
        where: { userId: staff.id },
      });

      if (existingStaff) {
        await prisma.staff.update({
          where: { userId: staff.id },
          data: {
            branchId: branch.id,
            staffRole: staffMapping.staffRole,
            commissionPercentage: staffMapping.commissionPercentage,
          },
        });
      } else {
        await prisma.staff.create({
          data: {
            userId: staff.id,
            branchId: branch.id,
            staffRole: staffMapping.staffRole,
            commissionPercentage: staffMapping.commissionPercentage,
          },
        });
      }

      // Create professional profile
      const staffRecord = existingStaff || (await prisma.staff.findUnique({
        where: { userId: staff.id },
      }));

      if (staffRecord) {
        await prisma.staffProfessionalProfile.upsert({
          where: { staffId: staffRecord.id },
          update: {},
          create: {
            staffId: staffRecord.id,
            bio: `${staff.name} - Professional ${staffMapping.staffRole}`,
            yearsOfExperience: 5,
            specialization: staffMapping.staffRole,
          },
        });
      }

      console.log(
        `👥 Linked staff: ${staff.email} → ${branch.businessName} (${staffMapping.staffRole})`,
      );
    }
  }

  console.log(
    "\n✅ All entities linked successfully!\n",
  );

  console.log("────────────────────────────────────────────────────────────");
  console.log("📋 SEEDED DATA SUMMARY");
  console.log("────────────────────────────────────────────────────────────");
  console.log("\n🔐 SUPER ADMIN:");
  console.log(`   Email:    ${SUPER_ADMIN_EMAIL}`);
  console.log(`   Password: ${SUPER_ADMIN_PASSWORD}`);
  console.log(`   Phone:    ${SUPER_ADMIN_PHONE}`);
  console.log(`   Role:     Super Admin\n`);

  console.log("👥 CLIENTS:");
  SEED_USERS.forEach((user) => {
    console.log(`   ${user.email} (Password: ${user.password})`);
  });

  console.log("\n👨‍💼 STAFF:");
  SEED_STAFF.forEach((staff) => {
    console.log(`   ${staff.email} (Password: ${staff.password})`);
  });

  console.log("\n🏢 BRANCH ADMINS (LINKED with users & services):");
  SEED_BRANCH_APPLICATIONS.forEach((app) => {
    console.log(`   ${app.businessName}`);
    console.log(`      Owner:    ${app.ownerName}`);
    console.log(`      Email:    ${app.email} (Password: ${app.password})`);
    console.log(`      Category: ${app.category}`);
    console.log(`      Status:   ${app.status}`);
  });

  console.log("\n✨ LINKAGES CREATED:");
  console.log("   ✓ Branch Admin Users linked with BranchAdmin applications");
  console.log("   ✓ Service Categories linked with respective branches");
  console.log("   ✓ Services linked with categories and branches");
  console.log("   ✓ Staff members linked with branches");
  console.log("   ✓ Professional profiles created for all staff");
  console.log("\n────────────────────────────────────────────────────────────\n");
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
