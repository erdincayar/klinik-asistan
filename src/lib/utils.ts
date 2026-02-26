import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amountInKurus: number | null | undefined): string {
  const safe = Number(amountInKurus) || 0;
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(safe / 100);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function toKurus(tl: number): number {
  return Math.round(tl * 100);
}

export function fromKurus(kurus: number): number {
  return kurus / 100;
}
