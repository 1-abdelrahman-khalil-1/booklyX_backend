import "./config/faker.js";
import { prisma } from "./helpers/prisma.js";
import { createSpinner, logger } from "./helpers/logger.js";
import {
  LOGIN_COUNTER_KEY,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASSWORD,
  SUPER_ADMIN_PHONE,
} from "./config/constants.js";
import { seedPlans } from "./modules/plans.seed.js";
import { seedUsers } from "./modules/users.seed.js";
import { seedVerification } from "./modules/verification.seed.js";
import { seedBranches } from "./modules/branches.seed.js";
import { seedServices } from "./modules/services.seed.js";
import { seedOffers } from "./modules/offers.seed.js";
import { seedSubscriptions } from "./modules/subscriptions.seed.js";
import { seedStaff } from "./modules/staff.seed.js";
import { seedAppointments } from "./modules/appointments.seed.js";
import { seedReviews } from "./modules/reviews.seed.js";
import { getSeedBranchSubmissions } from "./generators/branches.generator.js";
import { getSeedStaff } from "./generators/staff.generator.js";

async function main() {
  logger.info("🌱 Starting database seed...\n");

  const counterSpinner = createSpinner("Ensuring system counters");
  await prisma.systemCounter.upsert({
    where: { key: LOGIN_COUNTER_KEY },
    update: {},
    create: { key: LOGIN_COUNTER_KEY, value: 0 },
  });
  counterSpinner.succeed("System counter ensured");

  const planSpinner = createSpinner("Seeding plans");
  const { starterPlan } = await seedPlans();
  planSpinner.succeed("Plans ensured successfully");

  const userSpinner = createSpinner("Seeding users");
  const { superAdmin, seedClients, seedInitialStaffUsers } = await seedUsers();
  userSpinner.succeed("Users seeded successfully");

  const branchSubmissions = getSeedBranchSubmissions();
  const staffSeeds = getSeedStaff(branchSubmissions);

  const verificationSpinner = createSpinner("Seeding verification codes");
  await seedVerification([
    SUPER_ADMIN_EMAIL,
    ...seedClients.map((user) => user.email),
    ...seedInitialStaffUsers.map((staff) => staff.email),
    ...staffSeeds.map((staff) => staff.email),
    ...branchSubmissions.map((branch) => branch.email),
  ]);
  verificationSpinner.succeed("Verification codes seeded");

  const branchSpinner = createSpinner("Seeding branches");
  const branchSeedResult = await seedBranches({
    starterPlan,
    branchSubmissions,
  });

  if (branchSeedResult.skipped) {
    branchSpinner.fail("Branch admin table is missing. Run migrations and re-run seed.");
    return;
  }

  branchSpinner.succeed("Branches seeded successfully");

  const servicesSpinner = createSpinner("Seeding services");
  const { serviceLookup } = await seedServices(branchSeedResult.seededBranchAdmins);
  servicesSpinner.succeed("Services seeded successfully");

  const offersSpinner = createSpinner("Seeding offers");
  await seedOffers(branchSeedResult.seededBranchAdmins, serviceLookup);
  offersSpinner.succeed("Offers seeded successfully");

  const subscriptionSpinner = createSpinner("Seeding subscriptions");
  await seedSubscriptions(branchSeedResult.seededApprovedBranches);
  subscriptionSpinner.succeed("Subscriptions seeded successfully");

  const staffSpinner = createSpinner("Seeding staff");
  const { staffSeeds: seededStaff } = await seedStaff(
    branchSubmissions,
    staffSeeds,
  );
  staffSpinner.succeed("Staff seeded successfully");

  const appointmentSpinner = createSpinner("Seeding appointments");
  const { reviewTargets } = await seedAppointments(
    seedClients.map((user) => user.email),
    [
      ...seedInitialStaffUsers.map((staff) => staff.email),
      ...seededStaff.map((staff) => staff.email),
    ],
  );
  appointmentSpinner.succeed("Appointments seeded successfully");

  const reviewSpinner = createSpinner("Seeding reviews");
  await seedReviews(reviewTargets);
  reviewSpinner.succeed("Reviews seeded successfully");

  logger.info("\n────────");
  logger.info("📋 SEEDED DATA SUMMARY");
  logger.info("────────");
  logger.info("\n🔐 SUPER ADMIN:");
  logger.info(`   Email:    ${SUPER_ADMIN_EMAIL}`);
  logger.info(`   Password: ${SUPER_ADMIN_PASSWORD}`);
  logger.info(`   Phone:    ${SUPER_ADMIN_PHONE}`);
  logger.info(`   Role:     ${superAdmin.role}\n`);

  logger.info("👥 CLIENTS:");
  seedClients.forEach((user) => {
    logger.info(`   ${user.email} (Password: ${user.password})`);
  });

  logger.info("\n👨‍💼 STAFF:");
  seedInitialStaffUsers.forEach((staff) => {
    logger.info(`   ${staff.email} (Password: ${staff.password})`);
  });

  logger.info("\n👷 ADDITIONAL STAFF:");
  seededStaff.forEach((staff) => {
    logger.info(`   ${staff.email} (Password: ${staff.password})`);
  });

  logger.info("\n🏢 BRANCH ADMINS (LINKED with users & services):");
  branchSubmissions.forEach((branchSubmission) => {
    logger.info(`   ${branchSubmission.businessName}`);
    logger.info(`      Owner:    ${branchSubmission.ownerName}`);
    logger.info(
      `      Email:    ${branchSubmission.email} (Password: ${branchSubmission.password})`,
    );
    logger.info(`      Category: ${branchSubmission.category}`);
    logger.info(`      Status:   ${branchSubmission.status}`);
  });

  logger.info("\n✨ LINKAGES CREATED:");
  logger.info("   ✓ Branch Admin Users linked with BranchAdmin submissions");
  logger.info("   ✓ Service Categories linked with respective branches");
  logger.info("   ✓ Services linked with categories and branches");
  logger.info("   ✓ Staff members linked with branches");
  logger.info("   ✓ Professional profiles created for all staff");
  logger.info("\n────────\n");
  logger.success("✅ Seed completed successfully!");
}

main()
  .catch((error) => {
    logger.error("❌ Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
