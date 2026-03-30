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

    await prisma.$transaction(async (tx) => {
      // Delete order matters due to foreign key constraints

      if (modules.includes("patients")) {
        await tx.alarmLog.deleteMany({ where: { clinicId } });
        await tx.alarm.deleteMany({ where: { clinicId } });
        await tx.reminderLog.deleteMany({ where: { clinicId } });
        await tx.consentFormResponse.deleteMany({ where: { clinicId } });
        await tx.transactionCustomValue.deleteMany({
          where: { treatment: { clinicId } },
        });
        await tx.invoice.deleteMany({ where: { clinicId } });
        await tx.treatment.deleteMany({ where: { clinicId } });
        await tx.patientPhoto.deleteMany({
          where: { patient: { clinicId } },
        });
        await tx.patientPreference.deleteMany({ where: { clinicId } });
        await tx.patientVisitPattern.deleteMany({ where: { clinicId } });
        await tx.assistantAppointment.deleteMany({ where: { clinicId } });
        await tx.appointment.deleteMany({ where: { clinicId } });
        await tx.customerCustomValue.deleteMany({
          where: { patient: { clinicId } },
        });
        await tx.patient.deleteMany({ where: { clinicId } });
      }

      if (modules.includes("appointments") && !modules.includes("patients")) {
        await tx.assistantAppointment.deleteMany({ where: { clinicId } });
        await tx.appointment.deleteMany({ where: { clinicId } });
        await tx.clinicSchedule.deleteMany({ where: { clinicId } });
      } else if (modules.includes("appointments")) {
        await tx.clinicSchedule.deleteMany({ where: { clinicId } });
      }

      if (modules.includes("finance")) {
        await tx.recurringPayment.deleteMany({
          where: { recurringTransaction: { clinicId } },
        });
        await tx.recurringTransaction.deleteMany({ where: { clinicId } });
        await tx.uploadedInvoice.deleteMany({ where: { clinicId } });
        await tx.financialReport.deleteMany({ where: { clinicId } });
        if (!modules.includes("patients")) {
          await tx.invoice.deleteMany({ where: { clinicId } });
        }
        await tx.expense.deleteMany({ where: { clinicId } });
      }

      if (modules.includes("inventory")) {
        await tx.stockMovement.deleteMany({ where: { clinicId } });
        await tx.stockAlarm.deleteMany({ where: { clinicId } });
        await tx.fixedAsset.deleteMany({ where: { clinicId } });
        await tx.product.deleteMany({ where: { clinicId } });
      }

      if (modules.includes("employees")) {
        await tx.commissionTier.deleteMany({
          where: { employee: { clinicId } },
        });
        await tx.employeeCustomValue.deleteMany({
          where: { employee: { clinicId } },
        });
        await tx.employeeCustomField.deleteMany({ where: { clinicId } });
        await tx.employeeRole.deleteMany({ where: { clinicId } });
        await tx.hrDocument.deleteMany({ where: { clinicId } });
        // Recurring transactions linked to employees
        await tx.recurringTransaction.deleteMany({ where: { clinicId, employeeId: { not: null } } });
        await tx.employee.deleteMany({ where: { clinicId } });
      }

      if (modules.includes("messaging")) {
        if (!modules.includes("patients")) {
          await tx.reminderLog.deleteMany({ where: { clinicId } });
        }
        await tx.reminder.deleteMany({ where: { clinicId } });
        await tx.telegramLink.deleteMany({ where: { clinicId } });
        await tx.clinicConversation.deleteMany({ where: { clinicId } });
      }

      if (modules.includes("marketing")) {
        await tx.adCampaignMetric.deleteMany({ where: { clinicId } });
        await tx.adCampaign.deleteMany({ where: { clinicId } });
        await tx.socialMediaAsset.deleteMany({ where: { clinicId } });
        await tx.scheduledPost.deleteMany({ where: { clinicId } });
        await tx.aiGeneratedContent.deleteMany({ where: { clinicId } });
        await tx.clinicStyleProfile.deleteMany({ where: { clinicId } });
        await tx.metaAdsConnection.deleteMany({ where: { clinicId } });
      }

      if (modules.includes("ai_assistant")) {
        await tx.clinicKnowledgeBase.deleteMany({ where: { clinicId } });
        await tx.clinicAssistantConfig.deleteMany({ where: { clinicId } });
      }
    }, { timeout: 60000 }); // 60 saniye timeout

    return Response.json({ success: true, deletedModules: modules });
  } catch (err) {
    console.error("Reset data error:", err);
    return Response.json({ error: "Veri sıfırlama başarısız" }, { status: 500 });
  }
}
