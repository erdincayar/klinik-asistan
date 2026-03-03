import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { testConnection } from "@/lib/meta-ads";

export async function POST(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const result = await testConnection(clinicId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Test connection error:", error);
    return NextResponse.json({ success: false, error: "Test hatası" }, { status: 500 });
  }
}
