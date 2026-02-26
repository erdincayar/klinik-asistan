// PDF Report Generator
// Uses a simple approach: generates HTML that can be printed/saved as PDF

interface PdfReportData {
  title: string;
  period: string;
  clinicName: string;
  sections: {
    heading: string;
    rows: { label: string; value: string }[];
  }[];
  footer?: string;
}

export function generateReportHtml(data: PdfReportData): string {
  const sectionsHtml = data.sections
    .map(
      (section) => `
    <div class="section">
      <h2>${section.heading}</h2>
      <table>
        ${section.rows
          .map(
            (row) => `
          <tr>
            <td class="label">${row.label}</td>
            <td class="value">${row.value}</td>
          </tr>`
          )
          .join("")}
      </table>
    </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${data.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1a1a1a; }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #2563eb; }
    .header h1 { font-size: 24px; color: #2563eb; margin-bottom: 5px; }
    .header .subtitle { font-size: 14px; color: #666; }
    .header .clinic { font-size: 16px; font-weight: 600; margin-top: 5px; }
    .section { margin-bottom: 25px; }
    .section h2 { font-size: 16px; color: #2563eb; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #e5e7eb; }
    table { width: 100%; border-collapse: collapse; }
    tr { border-bottom: 1px solid #f3f4f6; }
    td { padding: 8px 12px; font-size: 14px; }
    .label { color: #6b7280; width: 50%; }
    .value { text-align: right; font-weight: 600; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.title}</h1>
    <div class="clinic">${data.clinicName}</div>
    <div class="subtitle">${data.period}</div>
  </div>
  ${sectionsHtml}
  <div class="footer">
    ${data.footer || `KlinikAsistan - ${new Date().toLocaleDateString("tr-TR")} tarihinde olusturuldu`}
  </div>
</body>
</html>`;
}

export function formatTL(amount: number): string {
  return amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
}

export function buildMonthlyReport(
  clinicName: string,
  month: string,
  year: number,
  data: {
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
    kdv: number;
    taxRate: number;
    treatmentCount: number;
    patientCount: number;
    topService: string;
    topServiceAmount: number;
  }
): string {
  return generateReportHtml({
    title: "Aylik Gelir-Gider Raporu",
    period: `${month} ${year}`,
    clinicName,
    sections: [
      {
        heading: "Gelir Ozeti",
        rows: [
          { label: "Toplam Gelir", value: formatTL(data.totalIncome) },
          { label: "Islem Sayisi", value: String(data.treatmentCount) },
          { label: "En Cok Kazandiran Servis", value: `${data.topService} (${formatTL(data.topServiceAmount)})` },
        ],
      },
      {
        heading: "Gider Ozeti",
        rows: [
          { label: "Toplam Gider", value: formatTL(data.totalExpense) },
        ],
      },
      {
        heading: "Kar-Zarar",
        rows: [
          { label: "Net Kar", value: formatTL(data.netProfit) },
          { label: `KDV (%${data.taxRate})`, value: formatTL(data.kdv) },
          { label: "Kar Marji", value: data.totalIncome > 0 ? `%${Math.round((data.netProfit / data.totalIncome) * 100)}` : "%0" },
        ],
      },
      {
        heading: "Musteri Ozeti",
        rows: [
          { label: "Toplam Hasta", value: String(data.patientCount) },
          { label: "Hasta Basina Ort. Gelir", value: data.patientCount > 0 ? formatTL(data.totalIncome / data.patientCount) : "0 TL" },
        ],
      },
    ],
  });
}
