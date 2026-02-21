import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const { patientId, message, appointmentId } = await request.json();

    if (!patientId || !message) {
      return Response.json(
        { error: "patientId ve message gerekli" },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId },
    });

    if (!patient) {
      return Response.json({ error: "Hasta bulunamadı" }, { status: 404 });
    }

    // Mock: Log the WhatsApp message
    console.log(`[WhatsApp] To: ${patient.phone || "N/A"}, Patient: ${patient.name}`);
    console.log(`[WhatsApp] Message: ${message}`);
    if (appointmentId) {
      console.log(`[WhatsApp] Appointment ID: ${appointmentId}`);
    }

    return Response.json({
      success: true,
      message: "WhatsApp mesajı gönderildi (simülasyon)",
    });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
