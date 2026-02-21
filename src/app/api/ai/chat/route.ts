import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Define tools
const tools: Anthropic.Tool[] = [
  {
    name: "get_monthly_revenue",
    description: "Belirtilen ay ve yıl için aylık gelir toplamını getirir. Tutarlar kuruş cinsindendir, TL'ye çevirmek için 100'e bölün.",
    input_schema: {
      type: "object" as const,
      properties: {
        month: { type: "number", description: "Ay (1-12)" },
        year: { type: "number", description: "Yıl" },
      },
      required: ["month", "year"],
    },
  },
  {
    name: "get_expenses",
    description: "Belirtilen ay ve yıl için giderleri listeler ve toplamını getirir.",
    input_schema: {
      type: "object" as const,
      properties: {
        month: { type: "number", description: "Ay (1-12)" },
        year: { type: "number", description: "Yıl" },
      },
      required: ["month", "year"],
    },
  },
  {
    name: "get_income_statement",
    description: "Belirtilen ay için gelir tablosu: toplam gelir, gider, net kâr ve KDV hesabı.",
    input_schema: {
      type: "object" as const,
      properties: {
        month: { type: "number", description: "Ay (1-12)" },
        year: { type: "number", description: "Yıl" },
      },
      required: ["month", "year"],
    },
  },
  {
    name: "search_patients",
    description: "Hasta adı veya telefon numarasına göre hasta arar.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Arama terimi" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_patient_history",
    description: "Belirtilen hastanın detaylı bilgilerini ve tedavi geçmişini getirir.",
    input_schema: {
      type: "object" as const,
      properties: {
        patientId: { type: "string", description: "Hasta ID" },
      },
      required: ["patientId"],
    },
  },
  {
    name: "get_vat_summary",
    description: "Belirtilen ay için KDV özeti: KDV dahil toplam, KDV tutarı, KDV hariç toplam.",
    input_schema: {
      type: "object" as const,
      properties: {
        month: { type: "number", description: "Ay (1-12)" },
        year: { type: "number", description: "Yıl" },
      },
      required: ["month", "year"],
    },
  },
  {
    name: "get_todays_appointments",
    description: "Bugünün randevularını getirir. Hasta adı, saat, işlem türü ve durum bilgisini içerir.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_available_slots",
    description: "Belirtilen tarih için müsait randevu saatlerini getirir.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Tarih (YYYY-MM-DD formatında)" },
      },
      required: ["date"],
    },
  },
  {
    name: "create_appointment",
    description: "Yeni bir randevu oluşturur.",
    input_schema: {
      type: "object" as const,
      properties: {
        patientId: { type: "string", description: "Hasta ID" },
        date: { type: "string", description: "Tarih (YYYY-MM-DD)" },
        startTime: { type: "string", description: "Başlangıç saati (HH:MM)" },
        endTime: { type: "string", description: "Bitiş saati (HH:MM)" },
        treatmentType: { type: "string", description: "İşlem türü: BOTOX, DOLGU, DIS_TEDAVI, GENEL" },
        notes: { type: "string", description: "Notlar (opsiyonel)" },
      },
      required: ["patientId", "date", "startTime", "endTime", "treatmentType"],
    },
  },
  {
    name: "cancel_appointment",
    description: "Bir randevuyu iptal eder. İptal edilen saati ve müsait alternatifleri döner.",
    input_schema: {
      type: "object" as const,
      properties: {
        appointmentId: { type: "string", description: "Randevu ID" },
      },
      required: ["appointmentId"],
    },
  },
];

// Tool execution functions
async function executeTool(name: string, input: Record<string, unknown>, clinicId: string) {
  switch (name) {
    case "get_monthly_revenue": {
      const { month, year } = input as { month: number; year: number };
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      const treatments = await prisma.treatment.findMany({
        where: {
          clinicId,
          date: { gte: startDate, lt: endDate },
        },
      });
      const total = treatments.reduce((sum, t) => sum + t.amount, 0);
      return { totalRevenue: total, totalRevenueTL: total / 100, treatmentCount: treatments.length, month, year };
    }
    case "get_expenses": {
      const { month, year } = input as { month: number; year: number };
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      const expenses = await prisma.expense.findMany({
        where: {
          clinicId,
          date: { gte: startDate, lt: endDate },
        },
      });
      const total = expenses.reduce((sum, e) => sum + e.amount, 0);
      return {
        expenses: expenses.map(e => ({ description: e.description, amount: e.amount / 100, category: e.category })),
        totalExpenses: total,
        totalExpensesTL: total / 100,
        month,
        year,
      };
    }
    case "get_income_statement": {
      const { month, year } = input as { month: number; year: number };
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
      const taxRate = clinic?.taxRate || 20;
      const treatments = await prisma.treatment.findMany({
        where: { clinicId, date: { gte: startDate, lt: endDate } },
      });
      const expenses = await prisma.expense.findMany({
        where: { clinicId, date: { gte: startDate, lt: endDate } },
      });
      const totalRevenue = treatments.reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = totalRevenue - totalExpenses;
      const vatAmount = Math.round(totalRevenue * taxRate / (100 + taxRate));
      return {
        totalRevenueTL: totalRevenue / 100,
        totalExpensesTL: totalExpenses / 100,
        netProfitTL: netProfit / 100,
        vatAmountTL: vatAmount / 100,
        taxRate,
        month,
        year,
      };
    }
    case "search_patients": {
      const { query } = input as { query: string };
      const patients = await prisma.patient.findMany({
        where: {
          clinicId,
          OR: [
            { name: { contains: query } },
            { phone: { contains: query } },
          ],
        },
        include: { _count: { select: { treatments: true } } },
        take: 10,
      });
      return { patients: patients.map(p => ({ id: p.id, name: p.name, phone: p.phone, email: p.email, treatmentCount: p._count.treatments })) };
    }
    case "get_patient_history": {
      const { patientId } = input as { patientId: string };
      const patient = await prisma.patient.findFirst({
        where: { id: patientId, clinicId },
        include: {
          treatments: { orderBy: { date: "desc" } },
        },
      });
      if (!patient) return { error: "Hasta bulunamadı" };
      return {
        name: patient.name,
        phone: patient.phone,
        email: patient.email,
        notes: patient.notes,
        treatments: patient.treatments.map(t => ({
          name: t.name,
          category: t.category,
          amountTL: t.amount / 100,
          date: t.date.toISOString().split("T")[0],
        })),
      };
    }
    case "get_vat_summary": {
      const { month, year } = input as { month: number; year: number };
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
      const taxRate = clinic?.taxRate || 20;
      const treatments = await prisma.treatment.findMany({
        where: { clinicId, date: { gte: startDate, lt: endDate } },
      });
      const totalWithVat = treatments.reduce((sum, t) => sum + t.amount, 0);
      const vatAmount = Math.round(totalWithVat * taxRate / (100 + taxRate));
      const totalWithoutVat = totalWithVat - vatAmount;
      return {
        totalWithVatTL: totalWithVat / 100,
        vatAmountTL: vatAmount / 100,
        totalWithoutVatTL: totalWithoutVat / 100,
        taxRate,
        month,
        year,
      };
    }
    case "get_todays_appointments": {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const appointments = await prisma.appointment.findMany({
        where: {
          clinicId,
          date: { gte: today, lt: tomorrow },
          status: { not: "CANCELLED" },
        },
        include: { patient: { select: { name: true, phone: true } } },
        orderBy: { startTime: "asc" },
      });
      return {
        date: today.toISOString().split("T")[0],
        appointments: appointments.map(a => ({
          id: a.id,
          patientName: a.patient.name,
          patientPhone: a.patient.phone,
          startTime: a.startTime,
          endTime: a.endTime,
          treatmentType: a.treatmentType,
          status: a.status,
          notes: a.notes,
        })),
        totalCount: appointments.length,
      };
    }
    case "get_available_slots": {
      const { date } = input as { date: string };
      const targetDate = new Date(date);
      const dayOfWeek = targetDate.getDay();
      const schedule = await prisma.clinicSchedule.findFirst({
        where: { clinicId, dayOfWeek, isActive: true },
      });
      if (!schedule) return { message: "Bu gün için çalışma programı bulunmuyor", slots: [] };

      // Generate all possible slots
      const slots: { startTime: string; endTime: string; available: boolean }[] = [];
      const [startH, startM] = schedule.startTime.split(":").map(Number);
      const [endH, endM] = schedule.endTime.split(":").map(Number);
      let currentMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      // Get existing appointments
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      const existing = await prisma.appointment.findMany({
        where: { clinicId, date: { gte: startOfDay, lte: endOfDay }, status: { not: "CANCELLED" } },
      });
      const occupiedTimes = existing.map(a => a.startTime);

      while (currentMinutes + schedule.slotDuration <= endMinutes) {
        const h = Math.floor(currentMinutes / 60);
        const m = currentMinutes % 60;
        const slotStart = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        const nextMinutes = currentMinutes + schedule.slotDuration;
        const nh = Math.floor(nextMinutes / 60);
        const nm = nextMinutes % 60;
        const slotEnd = `${nh.toString().padStart(2, "0")}:${nm.toString().padStart(2, "0")}`;

        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          available: !occupiedTimes.includes(slotStart),
        });
        currentMinutes = nextMinutes;
      }

      return { date, slots, availableCount: slots.filter(s => s.available).length };
    }
    case "create_appointment": {
      const { patientId, date, startTime, endTime, treatmentType, notes } = input as {
        patientId: string; date: string; startTime: string; endTime: string; treatmentType: string; notes?: string;
      };
      // Check patient belongs to clinic
      const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId } });
      if (!patient) return { error: "Hasta bulunamadı" };

      // Check for conflicts
      const appointmentDate = new Date(date);
      appointmentDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(appointmentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const conflict = await prisma.appointment.findFirst({
        where: {
          clinicId,
          date: { gte: appointmentDate, lt: nextDay },
          startTime,
          status: { not: "CANCELLED" },
        },
      });
      if (conflict) return { error: "Bu saatte başka bir randevu var" };

      const appointment = await prisma.appointment.create({
        data: { patientId, clinicId, date: appointmentDate, startTime, endTime, treatmentType, notes: notes || null },
        include: { patient: { select: { name: true } } },
      });
      return {
        id: appointment.id,
        patientName: appointment.patient.name,
        date: date,
        startTime,
        endTime,
        treatmentType,
        message: "Randevu oluşturuldu",
      };
    }
    case "cancel_appointment": {
      const { appointmentId } = input as { appointmentId: string };
      const appointment = await prisma.appointment.findFirst({
        where: { id: appointmentId, clinicId },
        include: { patient: { select: { name: true, phone: true } } },
      });
      if (!appointment) return { error: "Randevu bulunamadı" };

      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: "CANCELLED" },
      });

      return {
        message: "Randevu iptal edildi",
        cancelledAppointment: {
          patientName: appointment.patient.name,
          date: appointment.date.toISOString().split("T")[0],
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          treatmentType: appointment.treatmentType,
        },
      };
    }
    default:
      return { error: "Unknown tool" };
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clinicId = (session.user as any).clinicId;
  if (!clinicId) {
    return Response.json({ error: "No clinic" }, { status: 400 });
  }

  const { messages } = await req.json();

  const systemPrompt = `Sen KlinikAsistan AI asistanısın. Bir klinik yönetim sistemi için akıllı bir yardımcısın.
Görevlerin:
- Klinik gelir-gider analizleri yapma
- Hasta bilgilerini sorgulama
- KDV hesaplamaları
- Finansal özetler sunma
- Klinik yönetimi tavsiyeleri verme
- Randevu yönetimi (bugünün randevuları, müsait saatler, randevu oluşturma ve iptal)

Kurallar:
- Her zaman Türkçe yanıt ver
- Parasal değerleri TL formatında göster (ör: 1.500,00 ₺)
- Tarihler gün/ay/yıl formatında olsun
- Profesyonel ve yardımcı bir ton kullan
- Eğer veri bulamazsan, bunu açıkça belirt`;

  // Convert messages format
  const anthropicMessages = messages.map((m: { role: string; content: string }) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  try {
    // Initial call with tools
    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages: anthropicMessages,
    });

    // Tool use loop
    while (response.stop_reason === "tool_use") {
      const toolUseBlock = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      if (!toolUseBlock) break;

      const toolResult = await executeTool(toolUseBlock.name, toolUseBlock.input as Record<string, unknown>, clinicId);

      // Add assistant response and tool result to messages
      anthropicMessages.push({
        role: "assistant" as const,
        content: response.content,
      });
      anthropicMessages.push({
        role: "user" as const,
        content: [
          {
            type: "tool_result" as const,
            tool_use_id: toolUseBlock.id,
            content: JSON.stringify(toolResult),
          },
        ],
      });

      // Call again with tool results
      response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        tools,
        messages: anthropicMessages,
      });
    }

    // Extract text from final response
    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    return Response.json({
      message: textBlock?.text || "Yanıt oluşturulamadı.",
      role: "assistant",
    });
  } catch (error: unknown) {
    console.error("AI Error:", error);
    return Response.json(
      { error: "AI yanıt veremedi. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
