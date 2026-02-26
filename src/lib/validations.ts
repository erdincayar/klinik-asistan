import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir email adresi girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalı"),
  email: z.string().email("Geçerli bir email adresi girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
  clinicName: z.string().min(2, "Klinik adı en az 2 karakter olmalı"),
});

export const patientSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalı"),
  phone: z.string().optional(),
  email: z.string().email("Geçerli bir email adresi girin").optional().or(z.literal("")),
  notes: z.string().optional(),
});

export const treatmentSchema = z.object({
  patientId: z.string().min(1, "Hasta seçin"),
  name: z.string().min(2, "İşlem adı girin"),
  description: z.string().optional(),
  amount: z.number().min(1, "Tutar girin"),
  date: z.string().min(1, "Tarih seçin"),
  category: z.string().min(1, "Kategori seçin"),
});

export const expenseSchema = z.object({
  description: z.string().min(2, "Açıklama girin"),
  amount: z.number().min(1, "Tutar girin"),
  category: z.string().min(1, "Kategori seçin"),
  date: z.string().min(1, "Tarih seçin"),
});

export const reminderSchema = z.object({
  treatmentCategory: z.string().min(1, "Kategori seçin"),
  intervalDays: z.number().min(1, "Gün sayısı girin"),
  messageTemplate: z.string().min(5, "Mesaj şablonu girin"),
  isActive: z.boolean(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PatientInput = z.infer<typeof patientSchema>;
export type TreatmentInput = z.infer<typeof treatmentSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type ReminderInput = z.infer<typeof reminderSchema>;

export const appointmentSchema = z.object({
  patientId: z.string().min(1, "Hasta seçin"),
  date: z.string().min(1, "Tarih seçin"),
  startTime: z.string().min(1, "Başlangıç saati seçin"),
  endTime: z.string().min(1, "Bitiş saati seçin"),
  treatmentType: z.string().min(1, "İşlem türü seçin"),
  notes: z.string().optional(),
});

export const clinicScheduleSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  slotDuration: z.number().min(10).max(120),
  isActive: z.boolean(),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;
export type ClinicScheduleInput = z.infer<typeof clinicScheduleSchema>;

export const onboardingSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalı"),
  email: z.string().email("Geçerli bir email adresi girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
  clinicName: z.string().min(2, "İşletme adı en az 2 karakter olmalı"),
  sector: z.string().min(1, "Sektör seçin"),
  plan: z.enum(["BASIC", "PRO"]),
  selectedModules: z.array(z.string()).min(1, "En az 1 modül seçin"),
  messagingPreference: z.enum(["WHATSAPP", "TELEGRAM", "BOTH"]),
  phone: z.string().min(10, "Geçerli bir telefon numarası girin"),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Geçerli bir email adresi girin"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token gerekli"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
  confirmPassword: z.string().min(6, "Şifre tekrarı gerekli"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
