import {
  AppointmentStatus,
  BranchDocumentType,
  BranchStatus,
  BusinessCategory,
  OfferDiscountType,
  Role,
  ServiceApprovalStatus,
  StaffRole,
  UserStatus,
} from "../../src/generated/prisma/client.js";

export const SUPER_ADMIN_EMAIL = "admin@booklyx.com";
export const SUPER_ADMIN_PASSWORD = "12345678";
export const SUPER_ADMIN_PHONE = "01000000000";
export const SUPER_ADMIN_NAME = "Super Admin";
export const SALT_ROUNDS = 10;
export const LOGIN_COUNTER_KEY = "login";

export const DEFAULT_PLANS = [
  {
    name: "Starter",
    price: 199,
    maxStaff: 3,
    maxServices: 10,
    loyaltyEnabled: false,
    offersEnabled: false,
    isActive: true,
  },
  {
    name: "Pro",
    price: 499,
    maxStaff: 15,
    maxServices: 50,
    loyaltyEnabled: true,
    offersEnabled: true,
    isActive: true,
  },
  {
    name: "Enterprise",
    price: 1499,
    maxStaff: null,
    maxServices: null,
    loyaltyEnabled: true,
    offersEnabled: true,
    isActive: true,
  },
];

export const BUSINESS_CATEGORIES = [
  BusinessCategory.SPA,
  BusinessCategory.CLINIC,
  BusinessCategory.BARBER,
];

export const SERVICE_PLANS = [
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

export const APPOINTMENT_STATUS_PLAN = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.IN_PROGRESS,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELED,
];

export const REVIEW_COMMENTS = [
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

export const SEED_BRANCH_DOCUMENT_TYPES = [
  BranchDocumentType.TAX_CERTIFICATE,
  BranchDocumentType.COMMERCIAL_REGISTER,
  BranchDocumentType.NATIONAL_ID,
  BranchDocumentType.FACILITY_LICENSE,
];

export const STABLE_CLIENT_ACCOUNTS = [
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

export const STABLE_INITIAL_STAFF = [
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
];

export const STABLE_BRANCH_ADMINS = [
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
    status: BranchStatus.APPROVED,
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
    status: BranchStatus.APPROVED,
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
    status: BranchStatus.APPROVED,
    rejectionReason: null,
  },
];

export const STAFF_ROLE_POOL = [
  StaffRole.SPA_SPECIALIST,
  StaffRole.BARBER,
  StaffRole.DOCTOR,
];

export const OFFER_TARGETS = [
  { discountType: OfferDiscountType.PERCENTAGE, discountValue: 15 },
  { discountType: OfferDiscountType.FIXED, discountValue: 50 },
];
