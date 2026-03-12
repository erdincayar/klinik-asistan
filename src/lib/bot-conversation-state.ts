// In-memory conversation state manager for bot appointment employee selection
// Key format: "telegram:{chatId}" or "whatsapp:{phone}" or "test:{phone}"

export type ConversationStep = "IDLE" | "AWAITING_EMPLOYEE" | "AWAITING_CONFLICT_CONFIRM" | "AWAITING_PRODUCT_DELETE_CONFIRM";

export interface PendingAppointmentData {
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  endTime: string;
  treatmentType: string;
  notes: string;
  employees: { id: string; name: string }[];
  selectedEmployeeId?: string;
  selectedEmployeeName?: string;
}

export interface PendingProductDeleteData {
  productId: string;
  productName: string;
}

export interface ConversationState {
  step: ConversationStep;
  clinicId: string;
  pendingAppointment?: PendingAppointmentData;
  pendingProductDelete?: PendingProductDeleteData;
  createdAt: number;
}

const STATE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // 60 seconds

const conversations = new Map<string, ConversationState>();

// Periodic cleanup of expired states
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    const keys = Array.from(conversations.keys());
    for (const key of keys) {
      const state = conversations.get(key);
      if (state && now - state.createdAt > STATE_TIMEOUT_MS) {
        conversations.delete(key);
      }
    }
    // Stop interval if no conversations left
    if (conversations.size === 0 && cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  }, CLEANUP_INTERVAL_MS);
}

export function getConversationState(key: string): ConversationState | undefined {
  const state = conversations.get(key);
  if (!state) return undefined;
  // Check timeout
  if (Date.now() - state.createdAt > STATE_TIMEOUT_MS) {
    conversations.delete(key);
    return undefined;
  }
  return state;
}

export function setConversationState(key: string, state: ConversationState): void {
  conversations.set(key, state);
  ensureCleanup();
}

export function clearConversationState(key: string): void {
  conversations.delete(key);
}
