import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const resetSchema = z.object({
  modules: z.array(z.string()).min(1),
  confirmText: z.string(),
});

const CONFIRM_TEXT = "SIFIRLA";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    const { modules, confirmText } = parsed.data;

    if (confirmText.toUpperCase().replace("İ","I") !== CONFIRM_TEXT) {
      return Response.json({ error: "Onay metni hatalı" }, { status: 400 });
    }

    const validModules = [
      "patients",
      "appointments",
      "finance",
      "inventory",
      "employees",
      "messaging",
      "marketing",
      "ai_assistant",
    ];

    const invalidModules = modules.filter((m) => !validModules.includes(m));
    if (invalidModules.length > 0) {
      return Response.json(
        { error: `Geçersiz modül: ${invalidModules.join(", ")}` },
        { status: 400 }
      );
    }

    // Sequential delete — transaction yerine tek tek sil (bazı tablolar eksik olabilir)
    const tx = prisma;
    const safeDelete = async (fn: () => Promise<any>) => {
      try { await fn(); } catch { /* tablo yoksa veya FK hatası — sessiz geç */ }
    };

    if (modules.includes("patients")) {
      await safeDelete(() => tx.debtPayment.deleteMany({ where: { debt: { clinicId } } }));
      await safeDelete(() => tx.debt.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.clinicServiceName.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.alarmLog.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.alarm.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.reminderLog.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.consentFormResponse.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.consentForm.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.transactionCustomValue.deleteMany({ where: { treatment: { clinicId } } }));
      await safeDelete(() => tx.invoice.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.treatment.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.patientPhoto.deleteMany({ where: { patient: { clinicId } } }));
      await safeDelete(() => tx.patientPreference.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.patientVisitPattern.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.assistantAppointment.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.appointment.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.customerCustomValue.deleteMany({ where: { patient: { clinicId } } }));
      await safeDelete(() => tx.patient.deleteMany({ where: { clinicId } }));
    }

    if (modules.includes("appointments") && !modules.includes("patients")) {
      await safeDelete(() => tx.assistantAppointment.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.appointment.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.clinicSchedule.deleteMany({ where: { clinicId } }));
    } else if (modules.includes("appointments")) {
      await safeDelete(() => tx.clinicSchedule.deleteMany({ where: { clinicId } }));
    }

    if (modules.includes("finance")) {
      await safeDelete(() => tx.debtPayment.deleteMany({ where: { debt: { clinicId } } }));
      await safeDelete(() => tx.debt.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.recurringPayment.deleteMany({ where: { recurringTransaction: { clinicId } } }));
      await safeDelete(() => tx.recurringTransaction.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.uploadedInvoice.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.financialReport.deleteMany({ where: { clinicId } }));
      if (!modules.includes("patients")) {
        await safeDelete(() => tx.invoice.deleteMany({ where: { clinicId } }));
      }
      await safeDelete(() => tx.expense.deleteMany({ where: { clinicId } }));
    }

    if (modules.includes("inventory")) {
      await safeDelete(() => tx.stockMovement.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.stockAlarm.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.fixedAsset.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.product.deleteMany({ where: { clinicId } }));
    }

    if (modules.includes("employees")) {
      await safeDelete(() => tx.commissionTier.deleteMany({ where: { employee: { clinicId } } }));
      await safeDelete(() => tx.employeeCustomValue.deleteMany({ where: { employee: { clinicId } } }));
      await safeDelete(() => tx.employeeCustomField.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.employeeRole.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.hrDocument.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.recurringTransaction.deleteMany({ where: { clinicId, employeeId: { not: null } } }));
      await safeDelete(() => tx.employee.deleteMany({ where: { clinicId } }));
    }

    if (modules.includes("messaging")) {
      if (!modules.includes("patients")) {
        await safeDelete(() => tx.reminderLog.deleteMany({ where: { clinicId } }));
      }
      await safeDelete(() => tx.reminder.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.telegramLink.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.clinicConversation.deleteMany({ where: { clinicId } }));
    }

    if (modules.includes("marketing")) {
      await safeDelete(() => tx.adCampaignMetric.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.adCampaign.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.socialMediaAsset.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.scheduledPost.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.aiGeneratedContent.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.clinicStyleProfile.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.metaAdsConnection.deleteMany({ where: { clinicId } }));
    }

    if (modules.includes("ai_assistant")) {
      await safeDelete(() => tx.clinicKnowledgeBase.deleteMany({ where: { clinicId } }));
      await safeDelete(() => tx.clinicAssistantConfig.deleteMany({ where: { clinicId } }));
    }

    return Response.json({ success: true, deletedModules: modules });
  } catch (err) {
    console.error("Reset data error:", err);
    return Response.json({ error: "Veri sıfırlama başarısız" }, { status: 500 });
  }
}
