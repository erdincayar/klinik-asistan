import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, clinicId },
      include: {
        clinic: { select: { name: true, phone: true, address: true } },
        patient: { select: { name: true, phone: true, email: true } },
      },
    });

    if (!invoice) {
      return Response.json({ error: "Fatura bulunamadi" }, { status: 404 });
    }

    const items = invoice.items as Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      total: number;
    }>;

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
      }).format(amount / 100);

    const formatDate = (date: Date) =>
      new Intl.DateTimeFormat("tr-TR").format(new Date(date));

    const statusLabels: Record<string, string> = {
      DRAFT: "Taslak",
      SENT: "Gonderildi",
      APPROVED: "Onaylandi",
      CANCELLED: "Iptal Edildi",
    };

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fatura - ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
    .header-left h1 { font-size: 24px; color: #2563eb; }
    .header-left p { color: #666; margin-top: 4px; }
    .header-right { text-align: right; }
    .header-right h2 { font-size: 20px; color: #333; }
    .header-right .invoice-number { font-size: 16px; color: #2563eb; font-weight: bold; }
    .header-right .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; background: #dbeafe; color: #2563eb; margin-top: 8px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .party { width: 48%; }
    .party h3 { font-size: 14px; color: #666; text-transform: uppercase; margin-bottom: 8px; }
    .party p { font-size: 14px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f8fafc; padding: 12px; text-align: left; font-size: 13px; color: #666; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .text-right { text-align: right; }
    .totals { margin-left: auto; width: 300px; }
    .totals .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .totals .row.total { border-top: 2px solid #333; font-size: 18px; font-weight: bold; padding-top: 12px; }
    .notes { margin-top: 30px; padding: 16px; background: #f8fafc; border-radius: 8px; }
    .notes h3 { font-size: 14px; color: #666; margin-bottom: 8px; }
    .notes p { font-size: 14px; color: #333; }
    .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${invoice.clinic.name}</h1>
      ${invoice.clinic.phone ? `<p>Tel: ${invoice.clinic.phone}</p>` : ""}
      ${invoice.clinic.address ? `<p>${invoice.clinic.address}</p>` : ""}
    </div>
    <div class="header-right">
      <h2>${invoice.type === "EFATURA" ? "e-Fatura" : "e-Arsiv Fatura"}</h2>
      <div class="invoice-number">${invoice.invoiceNumber}</div>
      <div class="status">${statusLabels[invoice.status] || invoice.status}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Fatura Bilgileri</h3>
      <p>Tarih: ${formatDate(invoice.issueDate)}</p>
      ${invoice.dueDate ? `<p>Vade: ${formatDate(invoice.dueDate)}</p>` : ""}
    </div>
    <div class="party">
      <h3>Musteri Bilgileri</h3>
      <p><strong>${invoice.customerName}</strong></p>
      ${invoice.customerTaxNumber ? `<p>VKN: ${invoice.customerTaxNumber}</p>` : ""}
      ${invoice.customerTaxOffice ? `<p>VD: ${invoice.customerTaxOffice}</p>` : ""}
      ${invoice.customerAddress ? `<p>${invoice.customerAddress}</p>` : ""}
      ${invoice.customerEmail ? `<p>${invoice.customerEmail}</p>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Aciklama</th>
        <th class="text-right">Miktar</th>
        <th class="text-right">Birim Fiyat</th>
        <th class="text-right">KDV %</th>
        <th class="text-right">Toplam</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map(
          (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.description}</td>
        <td class="text-right">${item.quantity}</td>
        <td class="text-right">${formatCurrency(item.unitPrice)}</td>
        <td class="text-right">%${item.taxRate}</td>
        <td class="text-right">${formatCurrency(item.total)}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <div class="row">
      <span>Ara Toplam:</span>
      <span>${formatCurrency(invoice.subtotal)}</span>
    </div>
    <div class="row">
      <span>KDV (%${invoice.taxRate}):</span>
      <span>${formatCurrency(invoice.taxAmount)}</span>
    </div>
    <div class="row total">
      <span>Genel Toplam:</span>
      <span>${formatCurrency(invoice.total)}</span>
    </div>
  </div>

  ${
    invoice.notes
      ? `
  <div class="notes">
    <h3>Notlar</h3>
    <p>${invoice.notes}</p>
  </div>`
      : ""
  }

  <div class="footer">
    <p>Bu belge elektronik ortamda olusturulmustur.</p>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch {
    return Response.json({ error: "Bir hata olustu" }, { status: 500 });
  }
}
