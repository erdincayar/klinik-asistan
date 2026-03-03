import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: { clinicId },
      orderBy: { name: "asc" },
    });

    const rows = products.map((p) => ({
      "Ürün Adı": p.name,
      "SKU": p.sku,
      "Kategori": p.category,
      "Birim": p.unit,
      "Mevcut Stok": p.currentStock,
      "Minimum Stok": p.minStock,
      "Alış Fiyatı TL": p.purchasePrice / 100,
      "Alış Fiyatı USD": p.purchasePriceUSD ?? "",
      "Satış Fiyatı TL": p.salePrice / 100,
      "Son Güncelleme": p.updatedAt.toISOString().split("T")[0],
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-size columns
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String((r as any)[key]).length)) + 2,
    }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stok");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="inpobi-stok-${dateStr}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Dışa aktarma hatası" }, { status: 500 });
  }
}
