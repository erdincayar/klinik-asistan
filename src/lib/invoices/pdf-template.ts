import { formatCurrency, formatDate } from "@/lib/utils";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

interface InvoiceData {
  invoiceNumber: string;
  type: string;
  status: string;
  customerName: string;
  customerTaxNumber?: string | null;
  customerTaxOffice?: string | null;
  customerAddress?: string | null;
  customerEmail?: string | null;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string | null;
  issueDate: Date | string;
  dueDate?: Date | string | null;
}

interface ClinicData {
  name: string;
  phone?: string | null;
  address?: string | null;
}

function getTypeLabel(type: string): string {
  return type === "EFATURA" ? "e-Fatura" : type === "EARSIV" ? "e-Arsiv" : type;
}

export function generateInvoicePdf(invoice: InvoiceData, clinic: ClinicData): string {
  const items = (invoice.items || []) as InvoiceItem[];

  const itemsHtml = items
    .map(
      (item, index) => {
        const taxAmount = Math.round((item.unitPrice * item.quantity * item.taxRate) / 100);
        return `
        <tr>
          <td class="center">${index + 1}</td>
          <td>${item.description}</td>
          <td class="center">${item.quantity}</td>
          <td class="right">${formatCurrency(item.unitPrice)}</td>
          <td class="center">%${item.taxRate}</td>
          <td class="right">${formatCurrency(taxAmount)}</td>
          <td class="right">${formatCurrency(item.total)}</td>
        </tr>`;
      }
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Fatura - ${invoice.invoiceNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      color: #1a1a1a;
      font-size: 13px;
      line-height: 1.5;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }
    .header-left {
      flex: 1;
    }
    .header-left h1 {
      font-size: 22px;
      color: #2563eb;
      margin-bottom: 5px;
    }
    .header-left p {
      color: #6b7280;
      font-size: 13px;
    }
    .header-right {
      text-align: right;
    }
    .header-right .logo-placeholder {
      width: 80px;
      height: 80px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #2563eb;
      font-size: 11px;
      margin-left: auto;
    }

    /* Invoice info */
    .invoice-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 25px;
      gap: 20px;
    }
    .info-box {
      flex: 1;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
    }
    .info-box h3 {
      font-size: 12px;
      text-transform: uppercase;
      color: #2563eb;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }
    .info-box p {
      font-size: 13px;
      color: #374151;
      margin-bottom: 3px;
    }
    .info-box .label {
      color: #6b7280;
      font-size: 12px;
    }

    /* Items table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    .items-table thead {
      background: #2563eb;
      color: white;
    }
    .items-table th {
      padding: 10px 12px;
      font-size: 12px;
      font-weight: 600;
      text-align: left;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .items-table td {
      padding: 10px 12px;
      font-size: 13px;
      border-bottom: 1px solid #e5e7eb;
    }
    .items-table tbody tr:nth-child(even) {
      background: #f9fafb;
    }
    .items-table .center { text-align: center; }
    .items-table .right { text-align: right; }

    /* Totals */
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 25px;
    }
    .totals-box {
      width: 300px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .totals-row .label {
      color: #6b7280;
    }
    .totals-row .value {
      font-weight: 600;
    }
    .totals-row.grand-total {
      background: #2563eb;
      color: white;
      border-radius: 6px;
      border: none;
      font-size: 16px;
      padding: 12px;
    }
    .totals-row.grand-total .label,
    .totals-row.grand-total .value {
      color: white;
      font-weight: 700;
    }

    /* Notes */
    .notes {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 25px;
    }
    .notes h4 {
      font-size: 12px;
      color: #92400e;
      margin-bottom: 4px;
    }
    .notes p {
      font-size: 13px;
      color: #78350f;
    }

    /* Footer */
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
    }

    @media print {
      body { padding: 0; }
      .header { break-inside: avoid; }
      .items-table { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <h1>${clinic.name}</h1>
      ${clinic.phone ? `<p>${clinic.phone}</p>` : ""}
      ${clinic.address ? `<p>${clinic.address}</p>` : ""}
    </div>
    <div class="header-right">
      <div class="logo-placeholder">LOGO</div>
    </div>
  </div>

  <!-- Invoice & Customer Info -->
  <div class="invoice-info">
    <div class="info-box">
      <h3>Fatura Bilgileri</h3>
      <p><span class="label">Fatura No:</span> ${invoice.invoiceNumber}</p>
      <p><span class="label">Tarih:</span> ${formatDate(invoice.issueDate)}</p>
      ${invoice.dueDate ? `<p><span class="label">Vade Tarihi:</span> ${formatDate(invoice.dueDate)}</p>` : ""}
      <p><span class="label">Fatura Turu:</span> ${getTypeLabel(invoice.type)}</p>
    </div>
    <div class="info-box">
      <h3>Musteri Bilgileri</h3>
      <p><strong>${invoice.customerName}</strong></p>
      ${invoice.customerTaxNumber ? `<p><span class="label">Vergi No:</span> ${invoice.customerTaxNumber}</p>` : ""}
      ${invoice.customerTaxOffice ? `<p><span class="label">Vergi Dairesi:</span> ${invoice.customerTaxOffice}</p>` : ""}
      ${invoice.customerAddress ? `<p><span class="label">Adres:</span> ${invoice.customerAddress}</p>` : ""}
      ${invoice.customerEmail ? `<p><span class="label">E-posta:</span> ${invoice.customerEmail}</p>` : ""}
    </div>
  </div>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th class="center" style="width:50px">Sira</th>
        <th>Aciklama</th>
        <th class="center" style="width:70px">Miktar</th>
        <th class="right" style="width:110px">Birim Fiyat</th>
        <th class="center" style="width:70px">KDV</th>
        <th class="right" style="width:110px">KDV Tutari</th>
        <th class="right" style="width:110px">Toplam</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals">
    <div class="totals-box">
      <div class="totals-row">
        <span class="label">Ara Toplam</span>
        <span class="value">${formatCurrency(invoice.subtotal)}</span>
      </div>
      <div class="totals-row">
        <span class="label">KDV (%${invoice.taxRate})</span>
        <span class="value">${formatCurrency(invoice.taxAmount)}</span>
      </div>
      <div class="totals-row grand-total">
        <span class="label">Genel Toplam</span>
        <span class="value">${formatCurrency(invoice.total)}</span>
      </div>
    </div>
  </div>

  ${
    invoice.notes
      ? `<div class="notes">
    <h4>Notlar</h4>
    <p>${invoice.notes}</p>
  </div>`
      : ""
  }

  <!-- Footer -->
  <div class="footer">
    Bu belge elektronik ortamda olusturulmustur. | ${clinic.name} | ${formatDate(invoice.issueDate)}
  </div>
</body>
</html>`;
}
