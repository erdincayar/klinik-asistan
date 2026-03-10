import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const MODULES = [
  "PATIENTS", "APPOINTMENTS", "FINANCE", "INVOICES", "INVENTORY",
  "AI_ASSISTANT", "MESSAGING", "REPORTS", "MARKETING", "SOCIAL_MEDIA",
];

interface UserSeed {
  email: string;
  password: string;
  name: string;
  role: string;
  clinicName: string;
  sector: string;
  modules: string[];
}

const users: UserSeed[] = [
  {
    email: "admin@poby.ai",
    password: "Poby2026Admin!",
    name: "Erdinç (Admin)",
    role: "ADMIN",
    clinicName: "Poby Demo Klinik",
    sector: "SAGLIK",
    modules: MODULES, // tüm modüller
  },
  {
    email: "demo1@poby.ai",
    password: "Demo2026Test1!",
    name: "Test Kullanıcı 1",
    role: "DEMO",
    clinicName: "Demo Klinik 1",
    sector: "SAGLIK",
    modules: ["PATIENTS", "APPOINTMENTS", "FINANCE"],
  },
  {
    email: "demo2@poby.ai",
    password: "Demo2026Test2!",
    name: "Test Kullanıcı 2",
    role: "DEMO",
    clinicName: "Demo Klinik 2",
    sector: "RESTORAN",
    modules: ["INVENTORY", "FINANCE", "REPORTS"],
  },
  {
    email: "demo3@poby.ai",
    password: "Demo2026Test3!",
    name: "Test Kullanıcı 3",
    role: "DEMO",
    clinicName: "Demo Klinik 3",
    sector: "KUAFOR",
    modules: ["APPOINTMENTS", "MESSAGING", "SOCIAL_MEDIA"],
  },
];

async function main() {
  console.log("Kullanıcılar oluşturuluyor...\n");

  for (const u of users) {
    const hashedPassword = await hash(u.password, 12);

    // Klinik oluştur
    const clinic = await prisma.clinic.upsert({
      where: { id: `seed_clinic_${u.email.split("@")[0]}` },
      update: { name: u.clinicName, sector: u.sector },
      create: {
        id: `seed_clinic_${u.email.split("@")[0]}`,
        name: u.clinicName,
        sector: u.sector,
        plan: u.role === "ADMIN" ? "PRO" : "BASIC",
        selectedModules: JSON.stringify(u.modules),
      },
    });

    // Kullanıcı oluştur
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        password: hashedPassword,
        role: u.role,
        isActive: true,
        onboardingCompleted: true,
        clinicId: clinic.id,
      },
      create: {
        email: u.email,
        password: hashedPassword,
        name: u.name,
        role: u.role,
        isActive: true,
        onboardingCompleted: true,
        clinicId: clinic.id,
      },
    });

    // Modülleri bağla
    const dbModules = await prisma.module.findMany({
      where: { name: { in: u.modules } },
    });

    for (const mod of dbModules) {
      await prisma.clinicModule.upsert({
        where: { clinicId_moduleId: { clinicId: clinic.id, moduleId: mod.id } },
        update: { isActive: true },
        create: { clinicId: clinic.id, moduleId: mod.id, isActive: true },
      });
    }

    console.log(`  ✓ ${u.role.padEnd(5)} | ${u.email.padEnd(22)} | ${u.name}`);
    console.log(`         Klinik: ${u.clinicName} (${u.sector})`);
    console.log(`         Modüller: ${u.modules.join(", ")}\n`);
  }

  console.log("Tüm kullanıcılar başarıyla oluşturuldu!");
  console.log("\nGiriş bilgileri:");
  for (const u of users) {
    console.log(`  ${u.email} / ${u.password}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
