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

    const patients = await prisma.patient.findMany({
      where: { clinicId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { treatments: true } },
      },
    });

    // Generate CSV as a simple export (ExcelJS would need npm install)
    const header = "Ad Soyad,Telefon,Email,Notlar,İşlem Sayısı,Kayıt Tarihi";
    const rows = patients.map((p) => {
      const name = `"${(p.name || "").replace(/"/g, '""')}"`;
      const phone = `"${(p.phone || "").replace(/"/g, '""')}"`;
      const email = `"${(p.email || "").replace(/"/g, '""')}"`;
      const notes = `"${(p.notes || "").replace(/"/g, '""')}"`;
      const treatments = p._count?.treatments || 0;
      const date = new Date(p.createdAt).toLocaleDateString("tr-TR");
      return `${name},${phone},${email},${notes},${treatments},${date}`;
    });

    const csv = [header, ...rows].join("\n");
    const bom = "\uFEFF";

    return new NextResponse(bom + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="musteriler-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Dışa aktarma sırasında hata oluştu" },
      { status: 500 }
    );
  }
}
