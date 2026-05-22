import bcrypt from "bcrypt";
import dayjs from "dayjs";
import {
  ApplicationDocumentType,
  ApplicationStatus,
  AppointmentStatus,
  AvailabilityStatus,
  BusinessCategory,
  OfferDiscountType,
  PrismaClient,
  Role,
  ServiceApprovalStatus,
  StaffRole,
  UserStatus,
  VerificationType,
} from "../src/generated/prisma/client.js";

const SUPER_ADMIN_EMAIL = "admin@booklyx.com";
const SUPER_ADMIN_PASSWORD = "12345678";
const SUPER_ADMIN_PHONE = "01000000000";
const SUPER_ADMIN_NAME = "Super Admin";
const SALT_ROUNDS = 10;
const LOGIN_COUNTER_KEY = "login";

// ===== CENTRALIZED ASSETS MANAGEMENT =====
const ASSETS = {
  profileImages: {
    doctors: [
      "https://images.pexels.com/photos/5452201/pexels-photo-5452201.jpeg",
      "https://images.pexels.com/photos/6129507/pexels-photo-6129507.jpeg",
      "https://images.pexels.com/photos/8460372/pexels-photo-8460372.jpeg",
    ],

    barbers: [
      "https://images.pexels.com/photos/1813272/pexels-photo-1813272.jpeg",
      "https://images.pexels.com/photos/7697393/pexels-photo-7697393.jpeg",
      "https://images.pexels.com/photos/3992874/pexels-photo-3992874.jpeg",
    ],

    spa: [
      "https://images.pexels.com/photos/3985325/pexels-photo-3985325.jpeg",
      "https://images.pexels.com/photos/6621469/pexels-photo-6621469.jpeg",
      "https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg",
    ],
  },

  certificates: [
    "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    "https://www.orimi.com/pdf-test.pdf",
    "https://gahp.net/wp-content/uploads/2017/09/sample.pdf",
  ],

  executionAttachments: {
    barber: [
      "https://images.pexels.com/photos/1813272/pexels-photo-1813272.jpeg",
      "https://images.pexels.com/photos/7697393/pexels-photo-7697393.jpeg",
      "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg",
    ],

    spa: [
      "https://images.pexels.com/photos/3757942/pexels-photo-3757942.jpeg",
      "https://images.pexels.com/photos/6621469/pexels-photo-6621469.jpeg",
      "https://images.pexels.com/photos/3985331/pexels-photo-3985331.jpeg",
    ],

    medical: [
      "https://images.pexels.com/photos/3845756/pexels-photo-3845756.jpeg",
      "https://images.pexels.com/photos/7581572/pexels-photo-7581572.jpeg",
      "https://images.pexels.com/photos/8376233/pexels-photo-8376233.jpeg",
    ],
  },

  serviceImages: {
    barber: [
      // Haircut
      "https://images.pexels.com/photos/1813272/pexels-photo-1813272.jpeg",

      // Beard trim
      "https://images.pexels.com/photos/7697393/pexels-photo-7697393.jpeg",

      // Hair styling
      "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg",

      // Barber tools
      "https://images.pexels.com/photos/1319461/pexels-photo-1319461.jpeg",
    ],

    spa: [
      // Facial care
      "https://images.pexels.com/photos/3985325/pexels-photo-3985325.jpeg",

      // Massage
      "https://images.pexels.com/photos/3757942/pexels-photo-3757942.jpeg",

      // Skin care
      "https://images.pexels.com/photos/6621469/pexels-photo-6621469.jpeg",

      // Spa relaxing
      "https://images.pexels.com/photos/3764011/pexels-photo-3764011.jpeg",
    ],

    medical: [
      // Dental
      "https://images.pexels.com/photos/3845756/pexels-photo-3845756.jpeg",

      // Dermatology
      "https://images.pexels.com/photos/7581572/pexels-photo-7581572.jpeg",

      // Physiotherapy
      "https://images.pexels.com/photos/4506105/pexels-photo-4506105.jpeg",

      // Medical consultation
      "https://images.pexels.com/photos/8376233/pexels-photo-8376233.jpeg",
    ],
  },

  businessImages: {
    barber: [
      "https://images.pexels.com/photos/1319461/pexels-photo-1319461.jpeg",
      "https://images.pexels.com/photos/3992874/pexels-photo-3992874.jpeg",
    ],

    spa: [
      "https://images.pexels.com/photos/3757942/pexels-photo-3757942.jpeg",
      "https://images.pexels.com/photos/6621469/pexels-photo-6621469.jpeg",
    ],

    medical: [
      "https://images.pexels.com/photos/3845756/pexels-photo-3845756.jpeg",
      "https://images.pexels.com/photos/8376233/pexels-photo-8376233.jpeg",
    ],
  },

  offerImages: {
    barber: [
      "https://images.pexels.com/photos/7697393/pexels-photo-7697393.jpeg",
      "https://images.pexels.com/photos/1813272/pexels-photo-1813272.jpeg",
    ],

    spa: [
      "https://images.pexels.com/photos/3985325/pexels-photo-3985325.jpeg",
      "https://images.pexels.com/photos/3757942/pexels-photo-3757942.jpeg",
    ],

    medical: [
      "https://images.pexels.com/photos/3845756/pexels-photo-3845756.jpeg",
      "https://images.pexels.com/photos/7581572/pexels-photo-7581572.jpeg",
    ],
  },
};
// ===== HELPER UTILITIES =====
function pickRandom(arr, seed = 0) {
  if (!arr?.length) return null;

  return arr[seed % arr.length];
}

function getStaffProfileImage(role, index = 0) {
  switch (role) {
    case StaffRole.DOCTOR:
      return ASSETS.profileImages.doctors[index % ASSETS.profileImages.doctors.length];
    case StaffRole.BARBER:
      return ASSETS.profileImages.barbers[index % ASSETS.profileImages.barbers.length];
    case StaffRole.SPA_SPECIALIST:
      return ASSETS.profileImages.spa[index % ASSETS.profileImages.spa.length];
    default:
      return pickRandom(ASSETS.profileImages.spa, index);
  }
}

function getApplicationDocumentUrl(type) {
  return pickRandom(ASSETS.certificates);
}

function getServiceImage(category, index = 0) {
  switch (category) {
    case BusinessCategory.BARBER:
      return ASSETS.serviceImages.barber[index % ASSETS.serviceImages.barber.length];
    case BusinessCategory.CLINIC:
      return ASSETS.serviceImages.medical[index % ASSETS.serviceImages.medical.length];
    case BusinessCategory.SPA:
      return ASSETS.serviceImages.spa[index % ASSETS.serviceImages.spa.length];
    default:
      return pickRandom(ASSETS.serviceImages.spa, index);
  }
}

function getExecutionAttachment(category, index = 0) {
  switch (category) {
    case BusinessCategory.BARBER:
      return ASSETS.executionAttachments.barber[index % ASSETS.executionAttachments.barber.length];
    case BusinessCategory.CLINIC:
      return ASSETS.executionAttachments.medical[index % ASSETS.executionAttachments.medical.length];
    case BusinessCategory.SPA:
      return ASSETS.executionAttachments.spa[index % ASSETS.executionAttachments.spa.length];
    default:
      return pickRandom(ASSETS.executionAttachments.spa, index);
  }
}

const BUSINESS_CATEGORIES = [
  BusinessCategory.SPA,
  BusinessCategory.CLINIC,
  BusinessCategory.BARBER,
];

const BRANCH_APPLICATION_GROUPS = [
  {
    status: ApplicationStatus.PENDING_VERIFICATION,
    slug: "verification",
    title: "Verification",
    code: "VER",
    rejectionReason: null,
  },
  {
    status: ApplicationStatus.PENDING_APPROVAL,
    slug: "approval",
    title: "Approval",
    code: "APR",
    rejectionReason: null,
  },
  {
    status: ApplicationStatus.APPROVED,
    slug: "approved",
    title: "Approved",
    code: "APD",
    rejectionReason: null,
  },
  {
    status: ApplicationStatus.REJECTED,
    slug: "rejected",
    title: "Rejected",
    code: "REJ",
    rejectionReason: "Missing required documents or compliance checks.",
  },
];

const SEED_STABLE_BRANCH_ADMINS = [
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
    rejectionReason: null,
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
    rejectionReason: null,
  },
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
    status: ApplicationStatus.APPROVED,
    rejectionReason: null,
  },
];

const SERVICE_PLANS = [
  {
    categoryName: "Core Services",
    serviceNamePrefix: "Signature",
    description: "Core service seeded for coverage.",
    status: ServiceApprovalStatus.APPROVED,
  },
  {
    categoryName: "Premium Services",
    serviceNamePrefix: "Priority",
    description: "Premium service seeded for approval queue coverage.",
    status: ServiceApprovalStatus.PENDING_APPROVAL,
  },
  {
    categoryName: "Recovery Services",
    serviceNamePrefix: "Review",
    description: "Service seeded as a rejected scenario.",
    status: ServiceApprovalStatus.REJECTED,
  },
];

const APPOINTMENT_STATUS_PLAN = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.IN_PROGRESS,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELED,
];

const REVIEW_COMMENTS = [
  "Excellent attention to detail.",
  "Very professional and on time.",
  "Friendly staff and great service.",
  "Good value for money.",
  "Would recommend to my friends.",
  "Clean place and pleasant experience.",
  "Highly skilled and courteous.",
  "Service was ok but could improve.",
  "Outstanding result, thank you!",
  "Quick and efficient service.",
];

function buildBranchApplications() {
  return BRANCH_APPLICATION_GROUPS.flatMap((group, groupIndex) =>
    Array.from({ length: 5 }, (_, index) => {
      const sequence = groupIndex * 5 + index + 1;
      const emailSuffix = `${group.slug}-${String(index + 1).padStart(2, "0")}`;
      const cityPool = ["Cairo", "Giza", "Alexandria", "Mansoura", "Tanta"];
      const districtPool = [
        "Nasr City",
        "Dokki",
        "Heliopolis",
        "Maadi",
        "Zamalek",
      ];

      return {
        ownerName: `${group.title} Owner ${index + 1}`,
        email: `${emailSuffix}@booklyx.com`,
        phone: `0100003${String(sequence).padStart(4, "0")}`,
        password: "12345678",
        businessName: `${group.title} Wellness ${index + 1}`,
        category: BUSINESS_CATEGORIES[(groupIndex + index) % BUSINESS_CATEGORIES.length],
        description: `${group.title} branch seeded to cover onboarding workflows.`,
        commercialRegisterNumber: `CR-2026-${group.code}-${String(index + 1).padStart(3, "0")}`,
        taxId: `TAX-2026-${group.code}-${String(index + 1).padStart(3, "0")}`,
        city: cityPool[(groupIndex + index) % cityPool.length],
        district: districtPool[(groupIndex + index) % districtPool.length],
        address: `${10 + sequence} Seeded Street`,
        latitude: 29.95 + groupIndex * 0.05 + index * 0.01,
        longitude: 31.2 + groupIndex * 0.04 + index * 0.01,
        status: group.status,
        rejectionReason: group.rejectionReason,
      };
    }),
  );
}

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
    name: "Eslam Ahmed",
    email: "eslam.ahmed@booklyx.com",
    password: "12345678",
    phone: "01000000002",
    role: Role.client,
    status: UserStatus.ACTIVE,
  },
  {
    name: "Mohamed Ali",
    email: "mohamed.ali@booklyx.com",
    password: "12345678",
    phone: "01000000003",
    role: Role.client,
    status: UserStatus.ACTIVE,
  },
  {
    name: "Omar Hassan",
    email: "omar.hassan@booklyx.com",
    password: "12345678",
    phone: "01000000004",
    role: Role.client,
    status: UserStatus.ACTIVE,
  },
  {
    name: "Youssef Nabil",
    email: "youssef.nabil@booklyx.com",
    password: "12345678",
    phone: "01000000005",
    role: Role.client,
    status: UserStatus.ACTIVE,
  },
  {
    name: "Karim Mahmoud",
    email: "karim.mahmoud@booklyx.com",
    password: "12345678",
    phone: "01000000006",
    role: Role.client,
    status: UserStatus.ACTIVE,
  },
  {
    name: "Nora Saad",
    email: "nora.saad@booklyx.com",
    password: "12345678",
    phone: "01000000007",
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
    phone: "01000000022",
    age: 30,
    role: Role.staff,
    status: UserStatus.ACTIVE,
  },
  {
    name: "Sarah Adel",
    email: "sarah.adel@booklyx.com",
    password: "12345678",
    phone: "01000000023",
    age: 27,
    role: Role.staff,
    status: UserStatus.ACTIVE,
  },
];
const SEED_BRANCH_APPLICATIONS = [
  ...SEED_STABLE_BRANCH_ADMINS,
  ...buildBranchApplications(),
];

const SEED_STAFF = [
  {
    name: "Mahmoud Ibrahim",
    email: "mahmoud.staff@booklyx.com",
    phone: "01000000030",
    password: "12345678",
    age: 26,
    startDateOffsetDays: 90,
    profileImageUrl: ASSETS.profileImages.spa[0],
    staffRole: StaffRole.SPA_SPECIALIST,
    commissionPercentage: 25,
    branchEmail: "approved-01@booklyx.com",
  },
  {
    name: "Karim Ahmed",
    email: "karim.staff@booklyx.com",
    phone: "01000000031",
    password: "12345678",
    age: 28,
    startDateOffsetDays: 75,
    profileImageUrl: ASSETS.profileImages.barbers[0],
    staffRole: StaffRole.BARBER,
    commissionPercentage: 22.5,
    branchEmail: "approved-02@booklyx.com",
  },
  {
    name: "Hassan Adel",
    email: "hassan.staff@booklyx.com",
    phone: "01000000032",
    password: "12345678",
    age: 31,
    startDateOffsetDays: 110,
    profileImageUrl: ASSETS.profileImages.doctors[0],
    staffRole: StaffRole.DOCTOR,
    commissionPercentage: 20,
    branchEmail: "approved-03@booklyx.com",
  },
  {
    name: "Mona Youssef",
    email: "mona.staff@booklyx.com",
    phone: "01000000033",
    password: "12345678",
    age: 24,
    startDateOffsetDays: 65,
    profileImageUrl: ASSETS.profileImages.spa[1],
    staffRole: StaffRole.SPA_SPECIALIST,
    commissionPercentage: 18,
    branchEmail: "approved-04@booklyx.com",
  },
  {
    name: "Omar Fathy",
    email: "omar.staff@booklyx.com",
    phone: "01000000034",
    password: "12345678",
    age: 29,
    startDateOffsetDays: 80,
    profileImageUrl: ASSETS.profileImages.barbers[1],
    staffRole: StaffRole.BARBER,
    commissionPercentage: 21,
    branchEmail: "approved-05@booklyx.com",
  },
];

const SEED_STAFF_EMAILS = [
  ...SEED_INITIAL_STAFF_USERS.map((staff) => staff.email),
  ...SEED_STAFF.map((staff) => staff.email),
];

const SEED_STAFF_AVAILABILITY = SEED_STAFF.flatMap((staff, index) => [
  {
    email: staff.email,
    dayOfWeek: ((index + 1 - 1) % 7) + 1,
    startTime: "09:00",
    endTime: "17:00",
    status: AvailabilityStatus.AVAILABLE,
  },
  {
    email: staff.email,
    dayOfWeek: ((index + 4 - 1) % 7) + 1,
    startTime: "13:00",
    endTime: "15:00",
    status: AvailabilityStatus.UNAVAILABLE,
  },
]);

const SEED_STAFF_CERTIFICATES = SEED_STAFF.flatMap((staff, index) => [
  {
    staffEmail: staff.email,
    title: `${staff.name} Professional Certification`,
    issuer: "BooklyX Academy",
    issueDateOffsetMonths: 30 + index,
    expiryDateOffsetMonths: index % 2 === 0 ? 18 : null,
    verified: true,
  },
  {
    staffEmail: staff.email,
    title: `${staff.name} Compliance Badge`,
    issuer: "BooklyX QA Board",
    issueDateOffsetMonths: 12 + index,
    expiryDateOffsetMonths: null,
    verified: index % 2 === 0,
  },
]);

const SEED_APPLICATION_VERIFICATION_CODES = SEED_BRANCH_APPLICATIONS.flatMap(
  (application, index) => [
    {
      email: application.email,
      type: VerificationType.EMAIL,
      code: `APP-EMAIL-${String(index + 1).padStart(2, "0")}-111111`,
    },
    {
      email: application.email,
      type: VerificationType.PHONE,
      code: `APP-PHONE-${String(index + 1).padStart(2, "0")}-222222`,
    },
    {
      email: application.email,
      type: VerificationType.PASSWORD_RESET,
      code: `APP-RESET-${String(index + 1).padStart(2, "0")}-333333`,
    },
  ],
);

const SEED_APPLICATION_DOCUMENT_TYPES = [
  ApplicationDocumentType.TAX_CERTIFICATE,
  ApplicationDocumentType.COMMERCIAL_REGISTER,
  ApplicationDocumentType.NATIONAL_ID,
  ApplicationDocumentType.FACILITY_LICENSE,
];

const prisma = new PrismaClient();

const SEED_CLIENT_EMAILS = SEED_USERS
  .filter((user) => user.role === Role.client)
  .map((user) => user.email);

function daysAgo(days) {
  return dayjs().subtract(days, "day").startOf("day").toDate();
}

function monthsAgo(months) {
  return dayjs().subtract(months, "month").startOf("day").toDate();
}

function monthsFromNow(months) {
  return dayjs().add(months, "month").startOf("day").toDate();
}

function appointmentDate(dayOffset, hour, minute = 0) {
  return dayjs()
    .add(dayOffset, "day")
    .hour(hour)
    .minute(minute)
    .second(0)
    .millisecond(0)
    .toDate();
}

async function resetSeededAppointmentsAndReviews() {
  const seededClients = await prisma.client.findMany({
    where: { user: { email: { in: SEED_CLIENT_EMAILS } } },
    select: { id: true },
  });

  const clientIds = seededClients.map((client) => client.id);
  if (clientIds.length === 0) {
    return;
  }

  const appointments = await prisma.appointment.findMany({
    where: { clientId: { in: clientIds } },
    select: { id: true },
  });
  const appointmentIds = appointments.map((appointment) => appointment.id);

  await prisma.review.deleteMany({
    where: {
      OR: [
        { clientId: { in: clientIds } },
        { appointmentId: { in: appointmentIds } },
      ],
    },
  });

  await prisma.serviceExecution.deleteMany({
    where: { appointmentId: { in: appointmentIds } },
  });

  await prisma.appointment.deleteMany({
    where: { id: { in: appointmentIds } },
  });
}

async function refreshStaffRating(staffId) {
  const aggregate = await prisma.review.aggregate({
    where: { staffId, isVisible: true },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.staff.update({
    where: { id: staffId },
    data: {
      averageRating: Number((aggregate._avg.rating ?? 0).toFixed(2)),
      reviewCount: aggregate._count.rating,
    },
  });
}

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

    if (user.role === Role.client) {
      await prisma.client.upsert({
        where: { userId: seededUser.id },
        update: {},
        create: { userId: seededUser.id },
      });
    }

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

  const verificationTargets = await prisma.user.findMany({
    where: {
      email: {
        in: [
          SUPER_ADMIN_EMAIL,
          ...SEED_USERS.map((user) => user.email),
          ...SEED_INITIAL_STAFF_USERS.map((staff) => staff.email),
          ...SEED_STAFF.map((staff) => staff.email),
          ...SEED_BRANCH_APPLICATIONS.map((application) => application.email),
        ],
      },
    },
    orderBy: { id: "asc" },
  });

  const verificationSeeds = buildUserVerificationSeeds(
    verificationTargets.map((user) => user.id),
  );

  if (verificationTargets.length > 0) {
    await prisma.verificationCode.deleteMany({
      where: {
        userId: {
          in: verificationTargets.map((user) => user.id),
        },
      },
    });

    for (const verificationSeed of verificationSeeds) {
      const codeHash = await bcrypt.hash(verificationSeed.code, SALT_ROUNDS);

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
      const tokenHash = await bcrypt.hash(refreshTokenSeed.token, SALT_ROUNDS);

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
          rejectionReason: application.rejectionReason,
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
          rejectionReason: application.rejectionReason,
          userId: branchAdminUser.id,
        },
      });
    }

    console.log(
      `🏢 Seeded branch: ${application.businessName} (${application.status}) - Owner: ${branchAdminUser.email}`,
    );
    console.log(
      JSON.stringify(
        {
          branchAdmin: {
            id: branchAdmin.id,
            ownerName: branchAdmin.ownerName,
            email: branchAdmin.email,
            phone: branchAdmin.phone,
            businessName: branchAdmin.businessName,
            category: branchAdmin.category,
            status: branchAdmin.status,
            userId: branchAdmin.userId,
          },
          user: {
            id: branchAdminUser.id,
            name: branchAdminUser.name,
            email: branchAdminUser.email,
            phone: branchAdminUser.phone,
            role: branchAdminUser.role,
            status: branchAdminUser.status,
          },
        },
        null,
        2,
      ),
    );

    await prisma.applicationDocument.deleteMany({
      where: { applicationId: branchAdmin.id },
    });

    const documentTypes =
      application.status === ApplicationStatus.APPROVED
        ? SEED_APPLICATION_DOCUMENT_TYPES
        : SEED_APPLICATION_DOCUMENT_TYPES.slice(0, 2);

    for (const documentType of documentTypes) {
      await prisma.applicationDocument.create({
        data: {
          applicationId: branchAdmin.id,
          type: documentType,
          fileUrl: getApplicationDocumentUrl(documentType),
        },
      });
    }

    await prisma.applicationVerificationCode.deleteMany({
      where: { applicationId: branchAdmin.id },
    });

    const verificationCodes = SEED_APPLICATION_VERIFICATION_CODES.filter(
      (seed) => seed.email === application.email,
    );

    for (const verificationCode of verificationCodes) {
      const codeHash = await bcrypt.hash(
        verificationCode.code,
        SALT_ROUNDS,
      );

      await prisma.applicationVerificationCode.create({
        data: {
          applicationId: branchAdmin.id,
          type: verificationCode.type,
          codeHash,
          expiresAt: dayjs().add(3, "day").toDate(),
          used: false,
          attempts: 0,
        },
      });
    }

    if (application.status === ApplicationStatus.APPROVED) {
      for (const servicePlan of SERVICE_PLANS) {
        await prisma.serviceCategory.upsert({
          where: {
            branchId_name: {
              branchId: branchAdmin.id,
              name: servicePlan.categoryName,
            },
          },
          update: {},
          create: {
            branchId: branchAdmin.id,
            name: servicePlan.categoryName,
          },
        });
      }

      for (const servicePlan of SERVICE_PLANS) {
        const category = await prisma.serviceCategory.findFirst({
          where: {
            branchId: branchAdmin.id,
            name: servicePlan.categoryName,
          },
        });

        if (!category) {
          continue;
        }

        const serviceName = `${servicePlan.serviceNamePrefix} ${branchAdmin.id}`;
        const existingService = await prisma.service.findFirst({
          where: {
            branchId: branchAdmin.id,
            serviceCategoryId: category.id,
            name: serviceName,
          },
        });

        const serviceData = {
          branchId: branchAdmin.id,
          serviceCategoryId: category.id,
          name: serviceName,
          description: servicePlan.description,
          price:
            servicePlan.status === ServiceApprovalStatus.APPROVED
              ? 150 + branchAdmin.id
              : servicePlan.status === ServiceApprovalStatus.PENDING_APPROVAL
                ? 250 + branchAdmin.id
                : 100 + branchAdmin.id,
          durationMinutes:
            servicePlan.status === ServiceApprovalStatus.APPROVED
              ? 30
              : servicePlan.status === ServiceApprovalStatus.PENDING_APPROVAL
                ? 45
                : 60,
          imageUrl: getServiceImage(application.category, branchAdmin.id % 2),
          status: servicePlan.status,
          approvedAt:
            servicePlan.status === ServiceApprovalStatus.APPROVED
              ? dayjs().subtract(2, "day").toDate()
              : null,
          rejectionReason:
            servicePlan.status === ServiceApprovalStatus.REJECTED
              ? "Seeded rejected service scenario."
              : null,
        };

        if (existingService) {
          await prisma.service.update({
            where: { id: existingService.id },
            data: serviceData,
          });
        } else {
          await prisma.service.create({
            data: serviceData,
          });
        }
      }

      const approvedService = await prisma.service.findFirst({
        where: {
          branchId: branchAdmin.id,
          status: ServiceApprovalStatus.APPROVED,
        },
        select: { id: true },
      });

      const pendingService = await prisma.service.findFirst({
        where: {
          branchId: branchAdmin.id,
          status: ServiceApprovalStatus.PENDING_APPROVAL,
        },
        select: { id: true },
      });

      await prisma.offer.deleteMany({
        where: { branchId: branchAdmin.id },
      });

      const offerTargets = [
        {
          title: `Launch Percentage ${branchAdmin.id}`,
          discountType: OfferDiscountType.PERCENTAGE,
          discountValue: 15,
          serviceId: approvedService?.id,
        },
        {
          title: `Launch Fixed ${branchAdmin.id}`,
          discountType: OfferDiscountType.FIXED,
          discountValue: 50,
          serviceId: pendingService?.id ?? approvedService?.id,
        },
      ].filter((offer) => offer.serviceId);

      for (const offerTarget of offerTargets) {
        const offer = await prisma.offer.create({
          data: {
            branchId: branchAdmin.id,
            title: offerTarget.title,
            description: `Seeded ${offerTarget.discountType.toLowerCase()} offer for branch coverage.`,
            discountType: offerTarget.discountType,
            discountValue: offerTarget.discountValue,
            startDate: dayjs().subtract(1, "day").toDate(),
            endDate: dayjs().add(30, "day").toDate(),
            imageUrl: pickRandom(ASSETS.offerImages, branchAdmin.id),
            isActive: true,
            usageLimit: 50,
            usedCount: 0,
          },
        });

        await prisma.offerService.create({
          data: {
            offerId: offer.id,
            serviceId: offerTarget.serviceId,
          },
        });
      }
    }
  }

  console.log("\n");

  // Link staff to approved branches
  for (const staffData of SEED_STAFF) {
    const staffPasswordHash = await bcrypt.hash(staffData.password, SALT_ROUNDS);

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

    const branch = await prisma.branchAdmin.findFirst({
      where: { email: staffData.branchEmail },
    });

    if (!branch) {
      console.log(
        `⚠️  Skipping staff ${staffData.email} because branch ${staffData.branchEmail} was not found.`,
      );
      continue;
    }

    const existingStaff = await prisma.staff.findUnique({
      where: { userId: staffUser.id },
    });

    if (existingStaff) {
      await prisma.staff.update({
        where: { userId: staffUser.id },
        data: {
          branchId: branch.id,
          age: staffData.age,
          startDate: daysAgo(staffData.startDateOffsetDays),
          profileImageUrl: staffData.profileImageUrl,
          staffRole: staffData.staffRole,
          commissionPercentage: staffData.commissionPercentage,
        },
      });
    } else {
      await prisma.staff.create({
        data: {
          userId: staffUser.id,
          branchId: branch.id,
          age: staffData.age,
          startDate: daysAgo(staffData.startDateOffsetDays),
          profileImageUrl: staffData.profileImageUrl,
          staffRole: staffData.staffRole,
          commissionPercentage: staffData.commissionPercentage,
        },
      });
    }

    const staffRecord = await prisma.staff.findUnique({
      where: { userId: staffUser.id },
      select: { id: true },
    });

    const approvedServices = await prisma.service.findMany({
      where: {
        branchId: branch.id,
        status: ServiceApprovalStatus.APPROVED,
      },
      select: { id: true },
      orderBy: { id: "asc" },
    });

    if (staffRecord) {
      await prisma.staffService.deleteMany({
        where: { staffId: staffRecord.id },
      });

      if (approvedServices.length > 0) {
        await prisma.staffService.createMany({
          data: approvedServices.map((service) => ({
            staffId: staffRecord.id,
            serviceId: service.id,
          })),
        });
      }

      await prisma.staffProfessionalProfile.upsert({
        where: { staffId: staffRecord.id },
        update: {
          bio: `${staffData.name} - Professional ${staffData.staffRole}`,
          yearsOfExperience: 5,
          specialization: staffData.staffRole,
        },
        create: {
          staffId: staffRecord.id,
          bio: `${staffData.name} - Professional ${staffData.staffRole}`,
          yearsOfExperience: 5,
          specialization: staffData.staffRole,
        },
      });
    }

    console.log(
      `✅ Seeded staff: ${staffData.name} (${staffData.staffRole}) -> ${branch.businessName}`,
    );
  }

  console.log("🔐 Use seeded credentials to login as users/admin when testing.");
  console.log(
    "\n✅ All entities linked successfully!\n",
  );

  console.log("────────");
  console.log("📋 SEEDED DATA SUMMARY");
  console.log("────────");
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
  console.log("\n────────\n");

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
          status: availability.status,
        },
        create: {
          staffId: staff.id,
          dayOfWeek: availability.dayOfWeek,
          startTime: availability.startTime,
          endTime: availability.endTime,
          status: availability.status,
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
      await prisma.staffCertificate.deleteMany({
        where: {
          staffId: staff.id,
          title: cert.title,
        },
      });

      await prisma.staffCertificate.create({
        data: {
          staffId: staff.id,
          title: cert.title,
          issuer: cert.issuer,
          issueDate: monthsAgo(cert.issueDateOffsetMonths),
          expiryDate: cert.expiryDateOffsetMonths
            ? monthsFromNow(cert.expiryDateOffsetMonths)
            : null,
          fileUrl: pickRandom(ASSETS.certificates, staff.id),
          verified: cert.verified,
        },
      });
      console.log(`✅ Added certificate: ${cert.title} for ${cert.staffEmail}`);
    }
  }

  console.log("\n");

  // Seed Appointments
  console.log("📅 Seeding appointments...\n");

  await resetSeededAppointmentsAndReviews();

  const clients = await prisma.client.findMany({
    where: { user: { email: { in: SEED_CLIENT_EMAILS } } },
    include: { user: true },
    orderBy: { id: "asc" },
  });
  const staffMembers = await prisma.staff.findMany({
    where: { user: { email: { in: SEED_STAFF_EMAILS } } },
    include: { user: true },
    orderBy: { id: "asc" },
  });

  if (clients.length > 0 && staffMembers.length > 0) {
    const appointmentClients = clients.slice(0, 5);
    const appointmentStaff = staffMembers.slice(0, 5);

    for (let i = 0; i < appointmentClients.length; i++) {
      const client = appointmentClients[i];
      const staff = appointmentStaff[i % appointmentStaff.length];

      const staffService = await prisma.staffService.findFirst({
        where: { staffId: staff.id },
        include: { service: true },
        orderBy: { serviceId: "asc" },
      });

      if (!staffService) {
        continue;
      }

      const service = staffService.service;
      const branch = await prisma.branchAdmin.findUnique({
        where: { id: staff.branchId },
      });

      if (!branch) {
        continue;
      }

      for (let statusIndex = 0; statusIndex < APPOINTMENT_STATUS_PLAN.length; statusIndex++) {
        const status = APPOINTMENT_STATUS_PLAN[statusIndex];
        const scheduledDate = appointmentDate(i + statusIndex - 4, 9 + statusIndex * 2);

        const appointment = await prisma.appointment.create({
          data: {
            clientId: client.id,
            staffId: staff.id,
            serviceId: service.id,
            branchId: branch.id,
            scheduledAt: scheduledDate,
            status,
          },
        });

        if (status === AppointmentStatus.COMPLETED) {
          const rating = ((i + statusIndex) % 5) + 1;
          const comment = REVIEW_COMMENTS[(i + statusIndex) % REVIEW_COMMENTS.length];

          await prisma.review.create({
            data: {
              clientId: client.id,
              reviewerId: client.userId,
              serviceId: service.id,
              branchId: branch.id,
              staffId: staff.id,
              appointmentId: appointment.id,
              rating,
              comment,
              reviewerRole: Role.client,
              isVisible: (i + statusIndex) % 2 === 0,
              createdAt: dayjs(scheduledDate).add(1, "hour").toDate(),
            },
          });

          await prisma.serviceExecution.create({
            data: {
              appointmentId: appointment.id,
              notes: `Seeded completion notes for ${client.user.email}.`,
              attachments: [
                {
                  fileName: `execution-${appointment.id}.jpg`,
                  url: getExecutionAttachment(branch.category, (i + statusIndex) % 2),
                },
              ],
            },
          });
        }

        console.log(
          `✅ Created appointment for client ${client.user.email} with staff ${staff.user.email} on ${scheduledDate} (Status: ${status})`,
        );
      }
    }

    for (const staff of appointmentStaff) {
      await refreshStaffRating(staff.id);
    }
  }

  console.log("\n✅ Appointments seeded successfully!\n");

  console.log("────────");
  console.log("📋 SEED COMPLETED");
  console.log("────────");

  console.log("\n✨ FEATURES SEEDED:");
  console.log("   ✓ Staff Availability (working hours)");
  console.log("   ✓ Staff Certificates (licenses & qualifications)");
  console.log("   ✓ Appointments (PENDING, CONFIRMED, COMPLETED statuses)");
  console.log("   ✓ Reviews & Ratings (for completed appointments)");
  console.log("   ✓ Staff Average Ratings (calculated from reviews)");
  console.log("\n────────\n");
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
