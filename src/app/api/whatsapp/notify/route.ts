import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { sendWhatsAppMessage, sendDoctorNotification } from "@/lib/whatsapp/sender";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { patientId, message, phone, type } = body;

    // If type is "doctor", send to doctor
    if (type === "doctor") {
      const result = await sendDoctorNotification(message);
      return Response.json(result);
    }

    // Send to specific phone or patient's phone
    let targetPhone = phone;
    if (!targetPhone && patientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { phone: true },
      });
      targetPhone = patient?.phone;
    }

    if (!targetPhone) {
      return Response.json({ error: "Telefon numarasi bulunamadi" }, { status: 400 });
    }

    const result = await sendWhatsAppMessage(targetPhone, message);
    return Response.json(result);
  } catch (error) {
    console.error("[Notify] Error:", error);
    return Response.json({ error: "Bildirim gonderilemedi" }, { status: 500 });
  }
}
