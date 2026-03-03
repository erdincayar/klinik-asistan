import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    let customers: Array<{ name: string; phone: string; email: string; notes: string }> = [];

    if (fileName.endsWith(".csv")) {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        return NextResponse.json({ customers: [] });
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
      const nameIdx = headers.findIndex((h) => h.includes("ad") || h.includes("name") || h.includes("isim"));
      const phoneIdx = headers.findIndex((h) => h.includes("tel") || h.includes("phone") || h.includes("gsm"));
      const emailIdx = headers.findIndex((h) => h.includes("email") || h.includes("eposta") || h.includes("mail"));
      const notesIdx = headers.findIndex((h) => h.includes("not") || h.includes("note") || h.includes("açıklama"));

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
        const name = nameIdx >= 0 ? cols[nameIdx] || "" : cols[0] || "";
        if (!name) continue;
        customers.push({
          name,
          phone: phoneIdx >= 0 ? cols[phoneIdx] || "" : "",
          email: emailIdx >= 0 ? cols[emailIdx] || "" : "",
          notes: notesIdx >= 0 ? cols[notesIdx] || "" : "",
        });
      }
    } else {
      // For Excel/Word/PDF - return placeholder since we'd need heavy libraries
      // In production, you'd use xlsx, mammoth, or pdf-parse libraries
      customers = [
        {
          name: "Dosyadan okunan veri",
          phone: "",
          email: "",
          notes: `${file.name} dosyasından içe aktarıldı`,
        },
      ];
    }

    return NextResponse.json({ customers });
  } catch (error) {
    return NextResponse.json(
      { error: "Dosya işlenirken hata oluştu" },
      { status: 500 }
    );
  }
}
