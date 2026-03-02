export function generateInvoiceNumber(year: number, sequence: number): string {
  return `KA-${year}-${String(sequence).padStart(4, "0")}`;
}

export function getInvoiceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Taslak",
    SENT: "Gonderildi",
    APPROVED: "Onaylandi",
    CANCELLED: "Iptal",
  };
  return labels[status] || status;
}

export function getInvoiceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    EFATURA: "e-Fatura",
    EARSIV: "e-Arsiv",
  };
  return labels[type] || type;
}
