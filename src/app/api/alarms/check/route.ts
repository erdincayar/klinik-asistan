import { auth } from "@/lib/auth";
import { checkAllAlarms } from "@/lib/alarms/alarm-checker";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const result = await checkAllAlarms(clinicId);

    return Response.json(result);
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
