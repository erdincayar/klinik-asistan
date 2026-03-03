import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    // Get distinct treatment types from appointments
    const appointments = await prisma.appointment.findMany({
      where: { clinicId },
      select: { treatmentType: true },
      distinct: ["treatmentType"],
    });

    let types = appointments
      .map((a) => a.treatmentType)
      .filter((t) => t && t.trim() !== "");

    // Filter by query if provided (case-insensitive)
    if (query.length >= 2) {
      const lowerQuery = query.toLowerCase();
      types = types.filter((t) => t.toLowerCase().includes(lowerQuery));
    }

    // Sort alphabetically
    types.sort((a, b) => a.localeCompare(b, "tr"));

    return Response.json({ types });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
