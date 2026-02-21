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
