import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildExcelBuffer, formatDateTR } from "@/lib/utils/export";

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

    const patients = await prisma.patient.findMany({
      where: { clinicId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { treatments: true } },
        customValues: true,
      },
    });

    // Get custom columns for this clinic
    const customColumns = await prisma.customerCustomColumn.findMany({
      where: { clinicId },
      orderBy: { sortOrder: "asc" },
    });

    const rows: Record<string, unknown>[] = patients.map((p) => {
      const base: Record<string, unknown> = {
        "Ad Soyad": p.name,
        "Telefon": p.phone || "",
        "Email": p.email || "",
        "Notlar": p.notes || "",
        "İşlem Sayısı": p._count?.treatments || 0,
        "Kayıt Tarihi": formatDateTR(p.createdAt),
      };
      // Add custom column values
      for (const col of customColumns) {
        const cv = p.customValues.find((v) => v.columnKey === col.columnKey);
        base[col.columnName] = cv?.value || "";
      }
      return base;
    });

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `musteriler-${dateStr}.xlsx`;

    const buf = buildExcelBuffer(rows, "Müşteriler");

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Dışa aktarma sırasında hata oluştu" },
      { status: 500 }
    );
  }
}
