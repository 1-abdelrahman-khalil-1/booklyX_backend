import bcrypt from "bcrypt";
import dayjs from "dayjs";
import {
  ApplicationStatus,
  AppointmentStatus,
  AvailabilityStatus,
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
const LOGIN_COUNTER_KEY = "login";

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
    name: "Eslam Wael",
    email: "eslam.wael@booklyx.com",
    password: "12345678",
    phone: "01000000002",
    role: Role.client,
    status: UserStatus.ACTIVE,
  },
];
const SEED_INITIAL_STAFF_USERS = [
  {
    name: "Mazen Tamer",
    email: "mazen.tamer@booklyx.com",
    password: "12345678",
    phone: "01000000021",
    age: 22,
    role: Role.staff,
    status: UserStatus.ACTIVE,
  },
  {
    name: "Abdo Badr",
    email: "abdo.badr@booklyx.com",
    password: "12345678",
    age: 30,
    phone: "01000000022",
    role: Role.staff,
    status: UserStatus.ACTIVE,
  },
];
const SEED_BRANCH_APPLICATIONS = [
  {
    ownerName: "Mahmoud Ibrahim",
    email: "mahmoud.ibrahim@booklyx.com",
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
    branchEmail: "mahmoud.ibrahim@booklyx.com",
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
    branchEmail: "mahmoud.ibrahim@booklyx.com",
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
    branchEmail: "mahmoud.ibrahim@booklyx.com",
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
    staffEmail: "mazen.tamer@booklyx.com",
    branchEmail: "mahmoud.ibrahim@booklyx.com",
    age: 22,
    startDate: new Date("2026-01-05"),
    profileImageUrl: null,
    staffRole: StaffRole.BARBER,
    commissionPercentage: 15,
    serviceNames: ["Haircut", "Hair Coloring"],
  },
  {
    staffEmail: "abdo.badr@booklyx.com",
    branchEmail: "ahmed.samir@booklyx.com",
    age: 30,
    startDate: new Date("2026-01-12"),
    profileImageUrl: null,
    staffRole: StaffRole.DOCTOR,
    commissionPercentage: 20,
    serviceNames: ["General Checkup", "Skin Consultation"],
  },
];

const SEED_APPROVED_BRANCH_ADMINS = [
  {
    ownerName: "Eslam Wael",
    email: "eslam.branch@booklyx.com",
    phone: "01000000020",
    password: "12345678",
    businessName: "Eslam Premium Spa",
    category: BusinessCategory.SPA,
    description: "Luxury spa and wellness center",
    commercialRegisterNumber: "CR-2026-APX-001",
    taxId: "TAX-2026-APX-001",
    city: "Cairo",
    district: "Maadi",
    address: "5 Road 9, Maadi",
    latitude: 29.9699,
    longitude: 31.2675,
  },
];

const SEED_STAFF = [
  {
    name: "Mahmoud Ibrahim",
    email: "mahmoud.staff@booklyx.com",
    phone: "01000000030",
    password: "12345678",
    age: 26,
    startDate: new Date("2026-01-15"),
    profileImageUrl: null,
    staffRole: "SPA_SPECIALIST",
    commissionPercentage: 25,
  },
  {
    name: "Karim Ahmed",
    email: "karim.staff@booklyx.com",
    phone: "01000000031",
    password: "12345678",
    age: 28,
    startDate: new Date("2026-02-01"),
    profileImageUrl: null,
    staffRole: "SPA_SPECIALIST",
    commissionPercentage: 22.5,
  },
];

// Staff Availability (working hours per day of week: 1=Monday, 7=Sunday)
const SEED_STAFF_AVAILABILITY = [
  // Mazen Tamer - Working days Monday (1) to Friday (5)
  { email: "mazen.tamer@booklyx.com", dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
  { email: "mazen.tamer@booklyx.com", dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
  { email: "mazen.tamer@booklyx.com", dayOfWeek: 3, startTime: "09:00", endTime: "17:00" },
  { email: "mazen.tamer@booklyx.com", dayOfWeek: 4, startTime: "09:00", endTime: "17:00" },
  { email: "mazen.tamer@booklyx.com", dayOfWeek: 5, startTime: "09:00", endTime: "17:00" },
  // Abdo Badr - Working days Tuesday (2) to Saturday (6)
  { email: "abdo.badr@booklyx.com", dayOfWeek: 2, startTime: "10:00", endTime: "18:00" },
  { email: "abdo.badr@booklyx.com", dayOfWeek: 3, startTime: "10:00", endTime: "18:00" },
  { email: "abdo.badr@booklyx.com", dayOfWeek: 4, startTime: "10:00", endTime: "18:00" },
  { email: "abdo.badr@booklyx.com", dayOfWeek: 5, startTime: "10:00", endTime: "18:00" },
  { email: "abdo.badr@booklyx.com", dayOfWeek: 6, startTime: "10:00", endTime: "18:00" },
];

// Staff Certificates
const SEED_STAFF_CERTIFICATES = [
  {
    staffEmail: "mazen.tamer@booklyx.com",
    title: "Advanced Hair Styling Certification",
    issuer: "International Beauty Association",
    issueDate: new Date("2023-06-15"),
    expiryDate: new Date("2026-06-15"),
    verified: true,
  },
  {
    staffEmail: "mazen.tamer@booklyx.com",
    title: "Barbering Excellence Certificate",
    issuer: "Professional Barber Council",
    issueDate: new Date("2022-03-10"),
    expiryDate: null,
    verified: true,
  },
  {
    staffEmail: "abdo.badr@booklyx.com",
    title: "Medical License - General Practice",
    issuer: "Ministry of Health",
    issueDate: new Date("2020-01-20"),
    expiryDate: new Date("2027-01-20"),
    verified: true,
  },
  {
    staffEmail: "abdo.badr@booklyx.com",
    title: "Dermatology Specialization",
    issuer: "Egyptian Medical Association",
    issueDate: new Date("2021-09-05"),
    expiryDate: null,
    verified: true,
  },
];

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...\n");

  await prisma.systemCounter.upsert({
    where: { key: LOGIN_COUNTER_KEY },
    update: {},
    create: { key: LOGIN_COUNTER_KEY, value: 0 },
  });

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

  for (const staff of SEED_INITIAL_STAFF_USERS) {
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

  let branchAdminTableExists = true;
  try {
    await prisma.branchAdmin.count();
  } catch {
    branchAdminTableExists = false;
  }

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
            age: staffMapping.age,
            startDate: staffMapping.startDate,
            profileImageUrl: staffMapping.profileImageUrl,
            staffRole: staffMapping.staffRole,
            commissionPercentage: staffMapping.commissionPercentage,
          },
        });
      } else {
        await prisma.staff.create({
          data: {
            userId: staff.id,
            branchId: branch.id,
            age: staffMapping.age,
            startDate: staffMapping.startDate,
            profileImageUrl: staffMapping.profileImageUrl,
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
        const servicesToAssign = await prisma.service.findMany({
          where: {
            branchId: branch.id,
            status: ServiceApprovalStatus.APPROVED,
            ...(staffMapping.serviceNames?.length
              ? { name: { in: staffMapping.serviceNames } }
              : {}),
          },
          select: { id: true },
        });

        await prisma.staffService.deleteMany({
          where: { staffId: staffRecord.id },
        });

        if (servicesToAssign.length > 0) {
          await prisma.staffService.createMany({
            data: servicesToAssign.map((service) => ({
              staffId: staffRecord.id,
              serviceId: service.id,
            })),
          });
        }

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

  // Seed approved branch admins
  console.log("\n📝 Seeding approved branch admins...\n");

  for (const branchAdminData of SEED_APPROVED_BRANCH_ADMINS) {
    const ownerPasswordHash = await bcrypt.hash(
      branchAdminData.password,
      SALT_ROUNDS,
    );

    // Find existing branch admin by email
    let branchAdmin = await prisma.branchAdmin.findFirst({
      where: { email: branchAdminData.email },
    });

    if (branchAdmin) {
      // Update existing
      branchAdmin = await prisma.branchAdmin.update({
        where: { id: branchAdmin.id },
        data: {
          ownerName: branchAdminData.ownerName,
          passwordHash: ownerPasswordHash,
          phone: branchAdminData.phone,
          businessName: branchAdminData.businessName,
          category: branchAdminData.category,
          description: branchAdminData.description,
          commercialRegisterNumber: branchAdminData.commercialRegisterNumber,
          taxId: branchAdminData.taxId,
          city: branchAdminData.city,
          district: branchAdminData.district,
          address: branchAdminData.address,
          latitude: branchAdminData.latitude,
          longitude: branchAdminData.longitude,
          status: ApplicationStatus.APPROVED,
          emailVerified: true,
          phoneVerified: true,
        },
      });
    } else {
      // Create new
      branchAdmin = await prisma.branchAdmin.create({
        data: {
          ownerName: branchAdminData.ownerName,
          email: branchAdminData.email,
          phone: branchAdminData.phone,
          passwordHash: ownerPasswordHash,
          businessName: branchAdminData.businessName,
          category: branchAdminData.category,
          description: branchAdminData.description,
          commercialRegisterNumber: branchAdminData.commercialRegisterNumber,
          taxId: branchAdminData.taxId,
          city: branchAdminData.city,
          district: branchAdminData.district,
          address: branchAdminData.address,
          latitude: branchAdminData.latitude,
          longitude: branchAdminData.longitude,
          status: ApplicationStatus.APPROVED,
          emailVerified: true,
          phoneVerified: true,
        },
      });
    }

    // Create corresponding User record if not exists
    const branchAdminUser = await prisma.user.upsert({
      where: { email: branchAdminData.email },
      update: {
        name: branchAdminData.ownerName,
        password: ownerPasswordHash,
        phone: branchAdminData.phone,
        role: Role.branch_admin,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
      },
      create: {
        name: branchAdminData.ownerName,
        email: branchAdminData.email,
        password: ownerPasswordHash,
        phone: branchAdminData.phone,
        role: Role.branch_admin,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
      },
    });

    // Link User to BranchAdmin if not already linked
    if (!branchAdmin.userId) {
      await prisma.branchAdmin.update({
        where: { id: branchAdmin.id },
        data: { userId: branchAdminUser.id },
      });
    }

    console.log(
      `✅ Seeded branch admin: ${branchAdminData.businessName} (APPROVED)`,
    );
    console.log(`   Email: ${branchAdminData.email}`);
    console.log(`   Password: ${branchAdminData.password}\n`);
  }

  // Seed staff users
  console.log("📝 Seeding staff users...\n");

  // Get the first approved branch admin to assign staff to
  const approvedBranch = await prisma.branchAdmin.findFirst({
    where: { status: ApplicationStatus.APPROVED },
  });

  if (!approvedBranch) {
    console.log(
      "⚠️  No approved branch found. Skipping staff seeding. Please approve a branch first.\n",
    );
  } else {
    for (const staffData of SEED_STAFF) {
      const staffPasswordHash = await bcrypt.hash(staffData.password, SALT_ROUNDS);

      // Create staff user
      const staffUser = await prisma.user.upsert({
        where: { email: staffData.email },
        update: {
          name: staffData.name,
          password: staffPasswordHash,
          phone: staffData.phone,
          role: Role.staff,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          phoneVerified: true,
        },
        create: {
          name: staffData.name,
          email: staffData.email,
          password: staffPasswordHash,
          phone: staffData.phone,
          role: Role.staff,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          phoneVerified: true,
        },
      });

      // Create staff record
      await prisma.staff.upsert({
        where: { userId: staffUser.id },
        update: {
          age: staffData.age,
          startDate: staffData.startDate,
          profileImageUrl: staffData.profileImageUrl,
          staffRole: staffData.staffRole,
          commissionPercentage: staffData.commissionPercentage,
        },
        create: {
          userId: staffUser.id,
          branchId: approvedBranch.id,
          age: staffData.age,
          startDate: staffData.startDate,
          profileImageUrl: staffData.profileImageUrl,
          staffRole: staffData.staffRole,
          commissionPercentage: staffData.commissionPercentage,
        },
      });

      const approvedBranchServices = await prisma.service.findMany({
        where: {
          branchId: approvedBranch.id,
          status: ServiceApprovalStatus.APPROVED,
        },
        select: { id: true },
        orderBy: { id: "asc" },
        take: 2,
      });

      const staffRecord = await prisma.staff.findUnique({
        where: { userId: staffUser.id },
        select: { id: true },
      });

      if (staffRecord) {
        await prisma.staffService.deleteMany({
          where: { staffId: staffRecord.id },
        });

        if (approvedBranchServices.length > 0) {
          await prisma.staffService.createMany({
            data: approvedBranchServices.map((service) => ({
              staffId: staffRecord.id,
              serviceId: service.id,
            })),
          });
        }
      }

      console.log(
        `✅ Seeded staff: ${staffData.name} (${staffData.staffRole})`,
      );
      console.log(`   Email: ${staffData.email}`);
      console.log(`   Password: ${staffData.password}`);
      console.log(`   Branch: ${approvedBranch.businessName}\n`);
    }
  }

  console.log("🔐 Use seeded credentials to login as users/admin when testing.");
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
  SEED_INITIAL_STAFF_USERS.forEach((staff) => {
    console.log(`   ${staff.email} (Password: ${staff.password})`);
  });

  console.log("\n👷 ADDITIONAL STAFF:");
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

  console.log(
    "\n✨ LINKAGES CREATED:",
  );
  console.log("   ✓ Branch Admin Users linked with BranchAdmin applications");
  console.log("   ✓ Service Categories linked with respective branches");
  console.log("   ✓ Services linked with categories and branches");
  console.log("   ✓ Staff members linked with branches");
  console.log("   ✓ Professional profiles created for all staff");
  console.log("\n────────────────────────────────────────────────────────────\n");

  // Seed Staff Availability
  console.log("⏰ Seeding staff availability...\n");

  for (const availability of SEED_STAFF_AVAILABILITY) {
    const staff = await prisma.staff.findFirst({
      where: {
        user: { email: availability.email },
      },
    });

    if (staff) {
      await prisma.staffAvailability.upsert({
        where: {
          staffId_dayOfWeek: {
            staffId: staff.id,
            dayOfWeek: availability.dayOfWeek,
          },
        },
        update: {
          startTime: availability.startTime,
          endTime: availability.endTime,
          status: AvailabilityStatus.AVAILABLE,
        },
        create: {
          staffId: staff.id,
          dayOfWeek: availability.dayOfWeek,
          startTime: availability.startTime,
          endTime: availability.endTime,
          status: AvailabilityStatus.AVAILABLE,
        },
      });
      console.log(
        `  ✅ Day ${availability.dayOfWeek}: ${availability.startTime} - ${availability.endTime}`,
      );
    }
  }

  console.log("✅ Staff availability seeded successfully!\n");

  // Seed Staff Certificates
  console.log("🎓 Seeding staff certificates...\n");

  for (const cert of SEED_STAFF_CERTIFICATES) {
    const staff = await prisma.staff.findFirst({
      where: {
        user: { email: cert.staffEmail },
      },
    });

    if (staff) {
      await prisma.staffCertificate.create({
        data: {
          staffId: staff.id,
          title: cert.title,
          issuer: cert.issuer,
          issueDate: cert.issueDate,
          expiryDate: cert.expiryDate,
          fileUrl: `https://api.booklyx.com/certificates/${staff.id}/${cert.title.replace(/\s+/g, "_")}.pdf`,
          verified: cert.verified,
        },
      });
      console.log(`✅ Added certificate: ${cert.title} for ${cert.staffEmail}`);
    }
  }

  console.log("\n");

  // Seed Appointments
  console.log("📅 Seeding appointments...\n");

  const clients = await prisma.client.findMany({ include: { user: true } });
  const staffMembers = await prisma.staff.findMany({ include: { user: true } });

  if (clients.length > 0 && staffMembers.length > 0) {
    // Create appointments for each client
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      const staff = staffMembers[i % staffMembers.length]; // Cycle through staff

      // Get a service from the staff member's assigned services
      const staffService = await prisma.staffService.findFirst({
        where: { staffId: staff.id },
        include: { service: true },
      });

      if (staffService) {
        const service = staffService.service;
        const branch = await prisma.branchAdmin.findUnique({
          where: { id: staff.branchId },
        });

        const appointmentStatuses = [
          AppointmentStatus.COMPLETED,
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.PENDING,
        ];

        // Create 2-3 appointments per client with different statuses
        for (let j = 0; j < 3; j++) {
          const scheduledDate = dayjs()
            .add(j - 1, "day")
            .hour(9 + j * 2)
            .minute(0)
            .toDate();
          const status = appointmentStatuses[j % appointmentStatuses.length];

          const appointment = await prisma.appointment.create({
            data: {
              clientId: client.id,
              staffId: staff.id,
              serviceId: service.id,
              branchId: branch.id,
              scheduledAt: scheduledDate,
              status: status,
            },
          });

          console.log(
            `  📅 Created appointment: ${client.user.name} → ${staff.user.name} (${service.name}) - Status: ${status}`,
          );

          // Add review for completed appointments
          if (status === AppointmentStatus.COMPLETED) {
            const rating = 4 + Math.floor(Math.random() * 2); // Random rating between 4-5
            const comments = [
              "Excellent service, very professional!",
              "Great experience, will come again!",
              "Highly recommend this staff member!",
              "Professional and friendly service.",
              "Very satisfied with the service quality.",
            ];

            const review = await prisma.review.create({
              data: {
                clientId: client.id,
                reviewerId: client.userId,
                serviceId: service.id,
                branchId: branch.id,
                staffId: staff.id,
                appointmentId: appointment.id,
                rating: rating,
                comment: comments[Math.floor(Math.random() * comments.length)],
                isVisible: true,
                reviewerRole: Role.client,
              },
            });

            // Update staff average rating
            const staffRatings = await prisma.review.findMany({
              where: { staffId: staff.id },
              select: { rating: true },
            });

            const avgRating =
              staffRatings.length > 0
                ? staffRatings.reduce((sum, r) => sum + r.rating, 0) /
                  staffRatings.length
                : 0;

            await prisma.staff.update({
              where: { id: staff.id },
              data: {
                averageRating: Math.round(avgRating * 10) / 10,
                reviewCount: staffRatings.length,
              },
            });

            console.log(
              `    ⭐ Added review (${rating}/5): ${review.comment}`,
            );
          }
        }
      }
    }
  }

  console.log("\n✅ Appointments seeded successfully!\n");

  console.log("────────────────────────────────────────────────────────────");
  console.log("📋 SEED COMPLETED");
  console.log("────────────────────────────────────────────────────────────");

  console.log("\n✨ FEATURES SEEDED:");
  console.log("   ✓ Staff Availability (working hours)");
  console.log("   ✓ Staff Certificates (licenses & qualifications)");
  console.log("   ✓ Appointments (PENDING, CONFIRMED, COMPLETED statuses)");
  console.log("   ✓ Reviews & Ratings (for completed appointments)");
  console.log("   ✓ Staff Average Ratings (calculated from reviews)");
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
