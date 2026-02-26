import {
  getAppointments,
  getWeeklyAppointments,
  cancelAppointment,
  getIncome,
  getExpenses,
  getReport,
  getCashStatus,
  getPatientInfo,
  getPatientsList,
  getReminders,
  getDailySummary,
  getHelpText,
  sendReminderCommand,
  getDetailedReport,
  getTopServices,
  getTopPatients,
  getCommissionReport,
} from "./command-executor";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CommandResult {
  type: "command";
  response: string;
}

export interface NotCommand {
  type: "not_command";
  originalMessage: string;
}

export type CommandParseResult = CommandResult | NotCommand;

// ── Date Parsing Helpers ─────────────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
  ocak: 1,
  subat: 2,
  şubat: 2,
  mart: 3,
  nisan: 4,
  mayis: 5,
  mayıs: 5,
  haziran: 6,
  temmuz: 7,
  agustos: 8,
  ağustos: 8,
  eylul: 9,
  eylül: 9,
  ekim: 10,
  kasim: 11,
  kasım: 11,
  aralik: 12,
  aralık: 12,
};

const DAY_MAP: Record<string, number> = {
  pazartesi: 1,
  sali: 2,
  salı: 2,
  carsamba: 3,
  çarşamba: 3,
  persembe: 4,
  perşembe: 4,
  cuma: 5,
  cumartesi: 6,
  pazar: 0,
};

const TURKISH_MONTHS = [
  "Ocak",
  "Subat",
  "Mart",
  "Nisan",
  "Mayis",
  "Haziran",
  "Temmuz",
  "Agustos",
  "Eylul",
  "Ekim",
  "Kasim",
  "Aralik",
];

function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function getToday(): Date {
  return startOfDayUTC(new Date());
}

function getTomorrow(): Date {
  const d = getToday();
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function getNextDayOfWeek(dayIndex: number): Date {
  const today = new Date();
  const currentDay = today.getUTCDay();
  let daysUntil = dayIndex - currentDay;
  if (daysUntil <= 0) daysUntil += 7;
  const target = new Date(today);
  target.setUTCDate(today.getUTCDate() + daysUntil);
  return startOfDayUTC(target);
}

function getMonthRange(monthNum: number): { start: Date; end: Date; label: string } {
  const now = new Date();
  const year = now.getUTCFullYear();
  // If month is greater than current, might be previous year context -
  // but typically we assume current year
  const start = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));
  const label = `${TURKISH_MONTHS[monthNum - 1]} ${year}`;
  return { start, end, label };
}

function getCurrentMonthRange(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-indexed
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  const label = `${TURKISH_MONTHS[month]} ${year}`;
  return { start, end, label };
}

function getThisWeekRange(): { start: Date; end: Date } {
  const today = new Date();
  const dayOfWeek = today.getUTCDay(); // 0=Sunday
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + mondayOffset);
  const start = startOfDayUTC(monday);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const end = endOfDayUTC(sunday);

  return { start, end };
}

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

function parseDateArg(args: string): Date | null {
  const lower = args.toLowerCase().trim();

  if (!lower || lower === "bugün" || lower === "bugun") {
    return getToday();
  }

  if (lower === "yarın" || lower === "yarin") {
    return getTomorrow();
  }

  // Check day names
  for (const [dayName, dayIndex] of Object.entries(DAY_MAP)) {
    if (lower === dayName) {
      return getNextDayOfWeek(dayIndex);
    }
  }

  return null;
}

function parsePeriodArg(args: string): DateRange {
  const lower = args.toLowerCase().trim();

  if (!lower || lower === "bu ay") {
    const range = getCurrentMonthRange();
    return { start: range.start, end: range.end, label: range.label };
  }

  if (lower === "bugün" || lower === "bugun") {
    const today = getToday();
    const todayLabel = `${today.getUTCDate()} ${TURKISH_MONTHS[today.getUTCMonth()]}`;
    return { start: today, end: endOfDayUTC(today), label: todayLabel };
  }

  if (lower === "yarın" || lower === "yarin") {
    const tomorrow = getTomorrow();
    const label = `${tomorrow.getUTCDate()} ${TURKISH_MONTHS[tomorrow.getUTCMonth()]}`;
    return { start: tomorrow, end: endOfDayUTC(tomorrow), label };
  }

  if (lower === "bu hafta") {
    const range = getThisWeekRange();
    return { start: range.start, end: range.end, label: "Bu Hafta" };
  }

  // Check month names
  for (const [monthName, monthNum] of Object.entries(MONTH_MAP)) {
    if (lower === monthName) {
      const range = getMonthRange(monthNum);
      return { start: range.start, end: range.end, label: range.label };
    }
  }

  // Default: current month
  const range = getCurrentMonthRange();
  return { start: range.start, end: range.end, label: range.label };
}

// ── Main Handler ─────────────────────────────────────────────────────────────

export async function handleCommand(
  message: string,
  clinicId: string
): Promise<CommandParseResult> {
  const trimmed = message.trim();

  if (!trimmed.startsWith("/")) {
    return { type: "not_command", originalMessage: message };
  }

  // Parse command and args
  const parts = trimmed.substring(1).split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1).join(" ");

  try {
    let response: string;

    switch (command) {
      case "randevu": {
        response = await handleAppointmentCommand(clinicId, args);
        break;
      }

      case "gelir": {
        const period = parsePeriodArg(args);
        response = await getIncome(clinicId, period.start, period.end, period.label);
        break;
      }

      case "gider": {
        const period = parsePeriodArg(args);
        response = await getExpenses(clinicId, period.start, period.end, period.label);
        break;
      }

      case "rapor": {
        if (args.toLowerCase().trim() === "detay") {
          response = await getDetailedReport(clinicId);
        } else {
          const period = parsePeriodArg(args);
          response = await getReport(clinicId, period.start, period.end, period.label);
        }
        break;
      }

      case "kasa": {
        response = await getCashStatus(clinicId);
        break;
      }

      case "hasta": {
        response = await getPatientInfo(clinicId, args);
        break;
      }

      case "hastalar": {
        response = await getPatientsList(clinicId);
        break;
      }

      case "hatirlatmalar": {
        response = await getReminders(clinicId);
        break;
      }

      case "hatirlatma": {
        response = await handleReminderSubCommand(clinicId, args);
        break;
      }

      case "top": {
        response = await handleTopCommand(clinicId, args);
        break;
      }

      case "prim": {
        response = await getCommissionReport(clinicId);
        break;
      }

      case "ozet": {
        response = await getDailySummary(clinicId);
        break;
      }

      case "yardim":
      case "help": {
        response = getHelpText();
        break;
      }

      default: {
        response = `❌ Bilinmeyen komut: /${command}\n\nKullanilabilir komutlar icin /yardim yazin.`;
        break;
      }
    }

    return { type: "command", response };
  } catch (error) {
    console.error(`[CommandHandler] Error executing /${command}:`, error);
    return {
      type: "command",
      response: "❌ Komut calistirilirken bir hata olustu. Lutfen tekrar deneyin.",
    };
  }
}

// ── Appointment Sub-router ───────────────────────────────────────────────────

async function handleAppointmentCommand(
  clinicId: string,
  args: string
): Promise<string> {
  const lower = args.toLowerCase().trim();

  // No args → today's appointments
  if (!lower) {
    return getAppointments(clinicId, getToday());
  }

  // "bu hafta" → weekly summary
  if (lower === "bu hafta") {
    return getWeeklyAppointments(clinicId);
  }

  // "iptal [name]" → cancel appointment
  if (lower.startsWith("iptal")) {
    const patientName = args.substring(5).trim();
    return cancelAppointment(clinicId, patientName);
  }

  // Try to parse as a date
  const date = parseDateArg(lower);
  if (date) {
    return getAppointments(clinicId, date);
  }

  // If nothing matched, try as a date anyway (could be a day name not caught)
  // Default to today
  return getAppointments(clinicId, getToday());
}

// ── Reminder Sub-router ─────────────────────────────────────────────────────

async function handleReminderSubCommand(
  clinicId: string,
  args: string
): Promise<string> {
  const lower = args.toLowerCase().trim();

  if (lower === "gonder" || lower === "gönder") {
    return sendReminderCommand(clinicId);
  }

  // Default: show help
  return [
    "🔔 Hatirlatma Komutlari:",
    "/hatirlatmalar - Bekleyen hatirlatmalari goster",
    "/hatirlatma gonder - Tum hatirlatmalari gonder",
  ].join("\n");
}

// ── Top Sub-router ──────────────────────────────────────────────────────────

async function handleTopCommand(
  clinicId: string,
  args: string
): Promise<string> {
  const lower = args.toLowerCase().trim();

  if (lower === "servis" || lower === "hizmet") {
    return getTopServices(clinicId);
  }

  if (lower === "hasta" || lower === "musteri") {
    return getTopPatients(clinicId);
  }

  return [
    "📊 Top Komutlari:",
    "/top servis - En cok kazandiran servisler",
    "/top hasta - En cok gelen hastalar",
  ].join("\n");
}
