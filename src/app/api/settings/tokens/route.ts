import { auth } from "@/lib/auth";
import { getBalance, getHistory, addTokens } from "@/lib/token-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const [balance, history] = await Promise.all([
      getBalance(clinicId),
      getHistory(clinicId, 20),
    ]);

    return Response.json({ balance, history });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as any;
    const clinicId = user.clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    // Only admin/demo can manually add tokens
    if (user.role !== "ADMIN" && !user.isDemo) {
      return Response.json({ error: "Yetkisiz" }, { status: 403 });
    }

    const { amount, description } = await request.json();
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return Response.json({ error: "Geçersiz miktar" }, { status: 400 });
    }

    const updated = await addTokens(clinicId, amount, description || "Manuel token ekleme");
    return Response.json(updated);
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
