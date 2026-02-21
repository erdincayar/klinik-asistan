import { NextRequest } from "next/server";
import { processWhatsAppMessage } from "@/lib/whatsapp/message-parser";
import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { prisma } from "@/lib/prisma";

// GET: Webhook verification (for Twilio/Meta)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Meta WhatsApp verification
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  // Twilio verification - just return 200
  return Response.json({ status: "ok" });
}

// POST: Handle incoming WhatsApp message
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Extract message and sender info
    // Support both direct format (from our test UI) and Twilio format
    let messageText: string;
    let senderPhone: string;
    let clinicId: string;

    if (body.message && body.clinicId) {
      // Direct format from test UI
      messageText = body.message;
      senderPhone = body.senderPhone || "test-user";
      clinicId = body.clinicId;
    } else if (body.Body && body.From) {
      // Twilio format
      messageText = body.Body;
      senderPhone = body.From;
      // Find clinic by doctor's phone number or use first clinic
      const clinic = await prisma.clinic.findFirst();
      if (!clinic) {
        return Response.json({ error: "No clinic found" }, { status: 400 });
      }
      clinicId = clinic.id;
    } else {
      return Response.json({ error: "Invalid message format" }, { status: 400 });
    }

    // Process the message through AI parser
    const result = await processWhatsAppMessage(messageText, clinicId);

    // Send confirmation back via WhatsApp (mock)
    if (senderPhone !== "test-user") {
      await sendWhatsAppMessage(senderPhone, result.confirmationMessage);
    }

    // Return the full result for the test UI
    return Response.json({
      success: result.success,
      parsed: result.parsed,
      confirmationMessage: result.confirmationMessage,
      patientIsNew: result.patientIsNew,
      recordId: result.recordId,
    });
  } catch (error) {
    console.error("[Webhook] Error:", error);
    return Response.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
