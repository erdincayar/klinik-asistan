import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildExcelBuffer, formatDateTR, formatAmountTR } from "@/lib/utils/export";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const { columns = [] } = await req.json() as { columns: string[] };

    const includeTreatments = columns.includes("treatments");
    const includeCount = columns.includes("count");
    const includeRevenue = columns.includes("revenue");

    const patients = await prisma.patient.findMany({
      where: { clinicId },
      orderBy: { createdAt: "desc" },
      include: {
        treatments: includeTreatments || includeCount || includeRevenue
          ? { orderBy: { date: "desc" as const }, select: { name: true, category: true, amount: true, date: true } }
          : false,
        _count: { select: { treatments: true } },
        customValues: true,
      },
    });

    // Get custom columns
    const customColumns = await prisma.customerCustomColumn.findMany({
      where: { clinicId },
      orderBy: { sortOrder: "asc" },
    });

    const rows: Record<string, unknown>[] = [];

    for (const p of patients) {
      const base: Record<string, unknown> = { "Müşteri Adı": p.name };

      if (columns.includes("phone")) base["Telefon"] = p.phone || "";
      if (columns.includes("email")) base["Email"] = p.email || "";
      if (columns.includes("date")) base["Kayıt Tarihi"] = formatDateTR(p.createdAt);
      if (includeCount) base["İşlem Sayısı"] = p._count?.treatments || 0;
      if (includeRevenue) {
        const total = (p.treatments as any[])?.reduce((s: number, t: any) => s + t.amount, 0) || 0;
        base["Toplam Ciro"] = formatAmountTR(total);
      }

      // Custom columns
      for (const col of customColumns) {
        if (columns.includes(`custom_${col.columnKey}`)) {
          const cv = p.customValues.find((v) => v.columnKey === col.columnKey);
          base[col.columnName] = cv?.value || "";
        }
      }

      if (includeTreatments && (p.treatments as any[])?.length > 0) {
        for (const t of p.treatments as any[]) {
          rows.push({
            ...base,
            "İşlem Adı": t.name,
            "İşlem Kategori": t.category,
            "İşlem Tutar": formatAmountTR(t.amount),
            "İşlem Tarih": formatDateTR(t.date),
          });
        }
      } else {
        rows.push(base);
      }
    }

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `musteriler-${dateStr}.xlsx`;
    const buf = buildExcelBuffer(rows, "Müşteriler");

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Dışa aktarma sırasında hata oluştu" }, { status: 500 });
  }
}
