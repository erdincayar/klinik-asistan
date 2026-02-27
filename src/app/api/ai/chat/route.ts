import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processWhatsAppMessage } from "@/lib/whatsapp/message-parser";

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
  {
    name: "process_whatsapp_message",
    description: "Bir WhatsApp mesajını işler. Mesaj randevu, gelir veya gider olabilir. AI parse edip otomatik kaydeder.",
    input_schema: {
      type: "object" as const,
      properties: {
        message: { type: "string", description: "WhatsApp mesaj metni (ör: 'Ayşe hanım pazartesi 3te botoks')" },
      },
      required: ["message"],
    },
  },
  {
    name: "get_pending_reminders",
    description: "Bekleyen hasta hatirlatmalarini listeler. Kontrol zamani gelmis hastalari gosterir.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_patient_preferences",
    description: "Bir hastanin tercih etiketlerini ve ziyaret oruntusunu getirir.",
    input_schema: {
      type: "object" as const,
      properties: {
        patientId: { type: "string", description: "Hasta ID" },
      },
      required: ["patientId"],
    },
  },
  {
    name: "send_patient_reminder",
    description: "Belirtilen hastaya kisisellestirilmis hatirlatma mesaji gonderir.",
    input_schema: {
      type: "object" as const,
      properties: {
        patientId: { type: "string", description: "Hasta ID" },
      },
      required: ["patientId"],
    },
  },
  {
    name: "get_stock_summary",
    description: "Stok ozeti: toplam urun sayisi, toplam stok degeri, dusuk stok uyarisi sayisi ve kategori dagilimi.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_low_stock",
    description: "Minimum stok seviyesinin altindaki urunleri listeler.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "search_products",
    description: "Urun adina veya SKU'ya gore urun arar. Stok bilgilerini doner.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Arama terimi (urun adi veya SKU)" },
      },
      required: ["query"],
    },
  },
  {
    name: "record_stock_movement",
    description: "Stok hareketi kaydeder (giris veya cikis). Urunu ada gore bulur, stok hareketini olusturur ve mevcut stogu gunceller.",
    input_schema: {
      type: "object" as const,
      properties: {
        productName: { type: "string", description: "Urun adi" },
        type: { type: "string", description: "Hareket tipi: IN (giris) veya OUT (cikis)" },
        quantity: { type: "number", description: "Miktar" },
        description: { type: "string", description: "Aciklama (opsiyonel)" },
      },
      required: ["productName", "type", "quantity"],
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
    case "process_whatsapp_message": {
      const { message } = input as { message: string };
      const result = await processWhatsAppMessage(message, clinicId);
      return {
        success: result.success,
        type: result.parsed.type,
        confirmationMessage: result.confirmationMessage,
        patientIsNew: result.patientIsNew,
        recordId: result.recordId,
        parsedDetails: result.parsed,
      };
    }
    case "get_pending_reminders": {
      const { getPendingRemindersSummary } = await import("@/lib/reminders/reminder-engine");
      const pending = await getPendingRemindersSummary(clinicId);
      return {
        pendingCount: pending.length,
        patients: pending.map(p => ({
          patientId: p.patientId,
          name: p.patientName,
          phone: p.phone,
          category: p.treatmentCategory,
          lastTreatment: p.lastTreatmentDate,
          daysSince: p.daysSince,
        })),
      };
    }
    case "get_patient_preferences": {
      const { patientId } = input as { patientId: string };
      const patient = await prisma.patient.findFirst({
        where: { id: patientId, clinicId },
        include: {
          preferences: true,
          visitPattern: true,
        },
      });
      if (!patient) return { error: "Hasta bulunamadi" };
      return {
        name: patient.name,
        preferences: patient.preferences.map(p => p.type),
        visitPattern: patient.visitPattern ? {
          averageVisitDays: patient.visitPattern.averageVisitDays,
          totalVisits: patient.visitPattern.totalVisits,
          lastVisitDate: patient.visitPattern.lastVisitDate?.toISOString().split("T")[0],
          lastCategory: patient.visitPattern.lastCategory,
        } : null,
      };
    }
    case "send_patient_reminder": {
      const { patientId } = input as { patientId: string };
      const { findDuePatients, generatePersonalizedMessage, sendReminder } = await import("@/lib/reminders/reminder-engine");

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, clinicId },
        include: { preferences: true },
      });
      if (!patient) return { error: "Hasta bulunamadi" };

      // Find if this patient has any due reminders
      const allDue = await findDuePatients(clinicId);
      const patientDue = allDue.find(d => d.patientId === patientId);

      if (!patientDue) {
        return { message: "Bu hasta icin bekleyen hatirlatma bulunmuyor." };
      }

      const prefTypes = patient.preferences.map(p => p.type);
      const message = await generatePersonalizedMessage(
        patient.name,
        patientDue.treatmentCategory,
        patientDue.lastTreatmentDate,
        patientDue.intervalDays,
        prefTypes,
        patientDue.messageTemplate
      );

      const logId = await sendReminder(patientId, clinicId, message);
      return {
        success: true,
        logId,
        message,
        patientName: patient.name,
      };
    }
    case "get_stock_summary": {
      const products = await prisma.product.findMany({
        where: { clinicId, isActive: true },
      });
      const totalValue = products.reduce((sum, p) => sum + p.currentStock * p.purchasePrice, 0);
      const lowStockCount = products.filter((p) => p.currentStock <= p.minStock).length;
      const categoryDist: Record<string, number> = {};
      for (const p of products) {
        categoryDist[p.category] = (categoryDist[p.category] || 0) + 1;
      }
      return {
        totalProducts: products.length,
        totalStockValueTL: totalValue / 100,
        lowStockCount,
        categoryDistribution: categoryDist,
      };
    }
    case "get_low_stock": {
      const allProducts = await prisma.product.findMany({
        where: { clinicId, isActive: true },
      });
      const lowStock = allProducts
        .filter((p) => p.currentStock <= p.minStock)
        .map((p) => ({
          name: p.name,
          sku: p.sku,
          category: p.category,
          currentStock: p.currentStock,
          minStock: p.minStock,
          unit: p.unit,
          purchasePriceTL: p.purchasePrice / 100,
          salePriceTL: p.salePrice / 100,
        }));
      return { count: lowStock.length, products: lowStock };
    }
    case "search_products": {
      const { query } = input as { query: string };
      const found = await prisma.product.findMany({
        where: {
          clinicId,
          isActive: true,
          OR: [
            { name: { contains: query } },
            { sku: { contains: query } },
          ],
        },
        take: 10,
      });
      return {
        products: found.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          currentStock: p.currentStock,
          minStock: p.minStock,
          unit: p.unit,
          purchasePriceTL: p.purchasePrice / 100,
          salePriceTL: p.salePrice / 100,
        })),
      };
    }
    case "record_stock_movement": {
      const { productName, type: movementType, quantity, description: desc } = input as {
        productName: string; type: string; quantity: number; description?: string;
      };
      const searchTerm = productName.trim().toLowerCase();
      const matchingProducts = await prisma.product.findMany({
        where: { clinicId, isActive: true, name: { contains: productName.trim() } },
      });
      const product = matchingProducts.find((p) => p.name.toLowerCase().includes(searchTerm));
      if (!product) return { error: `Urun bulunamadi: "${productName}"` };

      if (movementType === "OUT" && product.currentStock < quantity) {
        return { error: `Yetersiz stok! ${product.name} mevcut: ${product.currentStock} ${product.unit}` };
      }

      const unitPrice = movementType === "IN" ? product.purchasePrice : product.salePrice;

      await prisma.$transaction([
        prisma.stockMovement.create({
          data: {
            productId: product.id,
            clinicId,
            type: movementType,
            quantity,
            unitPrice,
            totalPrice: unitPrice * quantity,
            description: desc || `AI asistan ile stok ${movementType === "IN" ? "girisi" : "cikisi"}`,
            date: new Date(),
          },
        }),
        prisma.product.update({
          where: { id: product.id },
          data: {
            currentStock: movementType === "IN"
              ? { increment: quantity }
              : { decrement: quantity },
          },
        }),
      ]);

      const newStock = movementType === "IN"
        ? product.currentStock + quantity
        : product.currentStock - quantity;

      return {
        success: true,
        productName: product.name,
        movementType,
        quantity,
        unit: product.unit,
        newStock,
        message: `${product.name}: ${quantity} ${product.unit} ${movementType === "IN" ? "eklendi" : "cikarildi"}. Yeni stok: ${newStock}`,
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
- Hasta hatirlatma yonetimi (bekleyen hatirlatmalar, hasta tercihleri, hatirlatma gonderme)
- Stok yonetimi (stok durumu, dusuk stoklu urunler, urun arama, stok giris/cikis)

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
