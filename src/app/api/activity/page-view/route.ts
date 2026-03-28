import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ ok: true }); // silent fail

    const { page } = await req.json();
    if (!page) return Response.json({ ok: true });

    await logActivity({
      userId: (session.user as any).id,
      clinicId: (session.user as any).clinicId,
      action: "PAGE_VIEW",
      details: { page },
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: true });
  }
}
