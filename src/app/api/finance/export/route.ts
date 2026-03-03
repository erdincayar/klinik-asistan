import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    // Fetch income (treatments) and expenses
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

    // Build CSV
    const header = "Tür,Tarih,Açıklama,Müşteri,Kategori,Tutar (TL)";
    const incomeRows = treatments.map((t) => {
      const type = "Gelir";
      const date = new Date(t.date).toLocaleDateString("tr-TR");
      const desc = `"${(t.name || "").replace(/"/g, '""')}"`;
      const patient = `"${(t.patient?.name || "").replace(/"/g, '""')}"`;
      const cat = t.category || "";
      const amount = (t.amount / 100).toFixed(2);
      return `${type},${date},${desc},${patient},${cat},${amount}`;
    });

    const expenseRows = expenses.map((e) => {
      const type = "Gider";
      const date = new Date(e.date).toLocaleDateString("tr-TR");
      const desc = `"${(e.description || "").replace(/"/g, '""')}"`;
      const patient = "";
      const cat = e.category || "";
      const amount = `-${(e.amount / 100).toFixed(2)}`;
      return `${type},${date},${desc},${patient},${cat},${amount}`;
    });

    const csv = [header, ...incomeRows, ...expenseRows].join("\n");
    const bom = "\uFEFF";

    const monthNames = ["Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran", "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik"];
    const filename = `finans-${monthNames[month - 1]}-${year}.csv`;

    return new NextResponse(bom + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
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
