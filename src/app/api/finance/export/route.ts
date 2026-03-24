import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildExcelBuffer, formatDateTR, formatAmountTR } from "@/lib/utils/export";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const { searchParams } = req.nextUrl;
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const [treatments, expenses] = await Promise.all([
      prisma.treatment.findMany({
        where: { clinicId, date: { gte: startDate, lt: endDate } },
        include: { patient: { select: { name: true } } },
        orderBy: { date: "desc" },
      }),
      prisma.expense.findMany({
        where: { clinicId, date: { gte: startDate, lt: endDate } },
        orderBy: { date: "desc" },
      }),
    ]);

    const rows: Record<string, unknown>[] = [
      ...treatments.map((t) => ({
        "Tür": "Gelir",
        "Tarih": formatDateTR(t.date),
        "Açıklama": t.name || "",
        "Müşteri": t.patient?.name || "",
        "Kategori": t.category || "",
        "Tutar (TL)": formatAmountTR(t.amount),
      })),
      ...expenses.map((e) => ({
        "Tür": "Gider",
        "Tarih": formatDateTR(e.date),
        "Açıklama": e.description || "",
        "Müşteri": "",
        "Kategori": e.category || "",
        "Tutar (TL)": formatAmountTR(-e.amount),
      })),
    ];

    const monthNames = ["Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran", "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik"];
    const filename = `finans-${monthNames[month - 1]}-${year}.xlsx`;

    const buf = buildExcelBuffer(rows, "Finans");

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Dışa aktarma sırasında hata oluştu" },
      { status: 500 }
    );
  }
}
