import * as XLSX from "xlsx";

export function buildExcelBuffer(
  data: Record<string, unknown>[],
  sheetName: string,
): ArrayBuffer {
  if (data.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([["Veri bulunamadı"]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  }

  const ws = XLSX.utils.json_to_sheet(data);

  // Auto-size columns
  const keys = Object.keys(data[0]);
  ws["!cols"] = keys.map((key) => ({
    wch:
      Math.max(
        key.length,
        ...data.map((r) => String(r[key] ?? "").length),
      ) + 2,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

/** GG.AA.YYYY formatına çevir */
export function formatDateTR(date: Date | string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/** Kuruş → ₺ string */
export function formatAmountTR(kurus: number): string {
  return `₺${(kurus / 100).toFixed(2)}`;
}
