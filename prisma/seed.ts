import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.reminderLog.deleteMany();
  await prisma.patientPreference.deleteMany();
  await prisma.patientVisitPattern.deleteMany();
  await prisma.treatment.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.clinicSchedule.deleteMany();
  await prisma.user.deleteMany();
  await prisma.clinic.deleteMany();

  const clinic = await prisma.clinic.create({
    data: {
      name: "Dr. Ayar Klinigi",
      phone: "05551234567",
      address: "Kadikoy, Istanbul",
      taxRate: 20,
      sector: "SAGLIK",
      plan: "PRO",
      selectedModules: JSON.stringify(["hasta", "randevu", "finans", "whatsapp", "rapor", "calisan", "hatirlatma"]),
      messagingPreference: "WHATSAPP",
    },
  });

  const hashedPassword = await hash("test123", 12);
  await prisma.user.create({
    data: {
      email: "test@klinik.com",
      password: hashedPassword,
      name: "Dr. Erdinc Ayar",
      clinicId: clinic.id,
      onboardingCompleted: true,
    },
  });

  const emp1 = await prisma.employee.create({
    data: { name: "Dr. Erdinc Ayar", role: "DOKTOR", phone: "05551234567", commissionRate: 0, clinicId: clinic.id },
  });
  const emp2 = await prisma.employee.create({
    data: { name: "Ayse Yildiz", role: "ASISTAN", phone: "05559876543", commissionRate: 10, clinicId: clinic.id },
  });

  const patient1 = await prisma.patient.create({
    data: { name: "Mehmet Ozturk", phone: "05321112233", email: "mehmet@email.com", notes: "Botoks tercihi", clinicId: clinic.id },
  });
  const patient2 = await prisma.patient.create({
    data: { name: "Fatma Demir", phone: "05344445566", email: "fatma@email.com", notes: "Sadik musteri", clinicId: clinic.id },
  });
  const patient3 = await prisma.patient.create({
    data: { name: "Ali Kaya", phone: "05367778899", notes: "Dis tedavisi", clinicId: clinic.id },
  });

  const now = new Date();

  // This month treatments
  await prisma.treatment.createMany({
    data: [
      { patientId: patient1.id, clinicId: clinic.id, employeeId: emp1.id, name: "Botoks - Alin", amount: 500000, date: new Date(now.getFullYear(), now.getMonth(), 5), category: "BOTOX" },
      { patientId: patient1.id, clinicId: clinic.id, employeeId: emp1.id, name: "Botoks - Goz Cevresi", amount: 350000, date: new Date(now.getFullYear(), now.getMonth(), 10), category: "BOTOX" },
      { patientId: patient2.id, clinicId: clinic.id, employeeId: emp1.id, name: "Dudak Dolgusu", amount: 400000, date: new Date(now.getFullYear(), now.getMonth(), 3), category: "DOLGU" },
      { patientId: patient2.id, clinicId: clinic.id, employeeId: emp2.id, name: "Yanak Dolgusu", amount: 600000, date: new Date(now.getFullYear(), now.getMonth(), 15), category: "DOLGU" },
      { patientId: patient3.id, clinicId: clinic.id, employeeId: emp2.id, name: "Dis Beyazlatma", amount: 250000, date: new Date(now.getFullYear(), now.getMonth(), 8), category: "DIS_TEDAVI" },
      { patientId: patient3.id, clinicId: clinic.id, name: "Genel Muayene", amount: 50000, date: new Date(now.getFullYear(), now.getMonth(), 1), category: "GENEL" },
    ],
  });

  // Previous month treatments
  await prisma.treatment.createMany({
    data: [
      { patientId: patient1.id, clinicId: clinic.id, employeeId: emp1.id, name: "Botoks - Alin", amount: 450000, date: new Date(now.getFullYear(), now.getMonth() - 1, 10), category: "BOTOX" },
      { patientId: patient2.id, clinicId: clinic.id, name: "Dudak Dolgusu", amount: 380000, date: new Date(now.getFullYear(), now.getMonth() - 1, 20), category: "DOLGU" },
    ],
  });

  // 6 months ago (for reminder testing)
  await prisma.treatment.create({
    data: { patientId: patient1.id, clinicId: clinic.id, name: "Botoks - Eski", amount: 400000, date: new Date(now.getFullYear(), now.getMonth() - 6, 15), category: "BOTOX" },
  });

  // Expenses
  await prisma.expense.createMany({
    data: [
      { clinicId: clinic.id, description: "Kira", amount: 2500000, category: "Kira", date: new Date(now.getFullYear(), now.getMonth(), 1) },
      { clinicId: clinic.id, description: "Malzeme Alisverisi", amount: 500000, category: "Malzeme", date: new Date(now.getFullYear(), now.getMonth(), 5) },
      { clinicId: clinic.id, description: "Elektrik Faturasi", amount: 150000, category: "Fatura", date: new Date(now.getFullYear(), now.getMonth(), 10) },
      { clinicId: clinic.id, description: "Internet", amount: 50000, category: "Fatura", date: new Date(now.getFullYear(), now.getMonth(), 10) },
      { clinicId: clinic.id, description: "Personel Maasi - Ayse", amount: 3000000, category: "Personel", date: new Date(now.getFullYear(), now.getMonth(), 15) },
    ],
  });

  // Today's appointments
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.appointment.createMany({
    data: [
      { patientId: patient1.id, clinicId: clinic.id, date: today, startTime: "10:00", endTime: "10:30", status: "SCHEDULED", treatmentType: "BOTOX", notes: "Kontrol randevusu" },
      { patientId: patient2.id, clinicId: clinic.id, date: today, startTime: "11:00", endTime: "11:30", status: "SCHEDULED", treatmentType: "DOLGU" },
      { patientId: patient3.id, clinicId: clinic.id, date: today, startTime: "14:00", endTime: "14:30", status: "SCHEDULED", treatmentType: "DIS_TEDAVI", notes: "Beyazlatma seansi" },
    ],
  });

  // Clinic schedule Mon-Sat
  const scheduleData = [];
  for (let day = 1; day <= 6; day++) {
    scheduleData.push({ clinicId: clinic.id, dayOfWeek: day, startTime: "09:00", endTime: "18:00", slotDuration: 30, isActive: true });
  }
  await prisma.clinicSchedule.createMany({ data: scheduleData });

  // Reminder rules
  await prisma.reminder.createMany({
    data: [
      { clinicId: clinic.id, treatmentCategory: "BOTOX", intervalDays: 180, messageTemplate: "Sayin {hasta}, botoks tedavinizin uzerinden 6 ay gecti.", isActive: true },
      { clinicId: clinic.id, treatmentCategory: "DOLGU", intervalDays: 365, messageTemplate: "Sayin {hasta}, dolgu tedavinizin yillik kontrol zamani.", isActive: true },
    ],
  });

  // Patient preferences
  await prisma.patientPreference.createMany({
    data: [
      { patientId: patient1.id, clinicId: clinic.id, type: "SADIK_MUSTERI" },
      { patientId: patient2.id, clinicId: clinic.id, type: "INDIRIM_SEVER" },
      { patientId: patient2.id, clinicId: clinic.id, type: "ARKADASIYLA_GELIR" },
      { patientId: patient3.id, clinicId: clinic.id, type: "FIYAT_HASSAS" },
    ],
  });

  // Visit patterns
  await prisma.patientVisitPattern.createMany({
    data: [
      { patientId: patient1.id, clinicId: clinic.id, averageVisitDays: 60, lastVisitDate: new Date(now.getFullYear(), now.getMonth(), 10), totalVisits: 3, lastCategory: "BOTOX" },
      { patientId: patient2.id, clinicId: clinic.id, averageVisitDays: 90, lastVisitDate: new Date(now.getFullYear(), now.getMonth(), 15), totalVisits: 2, lastCategory: "DOLGU" },
    ],
  });

  console.log("Seed completed!");
  console.log(`Clinic ID: ${clinic.id}`);
  console.log("Login: test@klinik.com / test123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
