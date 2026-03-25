import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLAN_TO_MODULES: Record<string, string[]> = {
  BASIC: ["base", "appointments", "customers", "finance", "messaging"],
  PRO: ["base", "appointments", "customers", "finance", "employees", "inventory", "messaging", "alarms"],
  BUSINESS: ["base", "appointments", "customers", "finance", "employees", "inventory", "messaging", "alarms", "reports"],
};

async function main() {
  console.log("Starting subscription plan migration...");

  const clinics = await prisma.clinic.findMany({
    select: { id: true, plan: true, storageLimitMB: true, storageUsedMB: true, storagePlan: true },
  });

  console.log(`Found ${clinics.length} clinics`);

  let created = 0;
  let skipped = 0;

  for (const clinic of clinics) {
    // Skip if already has a subscription plan
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { clinicId: clinic.id },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const planKey = clinic.plan || "PRO";
    const activeModules = PLAN_TO_MODULES[planKey] || PLAN_TO_MODULES.PRO;

    // Map storage plan
    let storagePlan = clinic.storagePlan || "free";
    if (!["free", "standard", "professional", "enterprise"].includes(storagePlan)) {
      storagePlan = "free";
    }

    await prisma.subscriptionPlan.create({
      data: {
        clinicId: clinic.id,
        status: "active",
        activeModules,
        storagePlan,
        storageUsedMb: clinic.storageUsedMB || 0,
        monthlyTotal: 0, // Will be recalculated
      },
    });

    created++;
    console.log(`Created plan for clinic ${clinic.id} (${planKey}): ${activeModules.join(", ")}`);
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
