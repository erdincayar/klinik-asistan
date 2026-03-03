import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateCampaignStatus } from "@/lib/meta-ads";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const { id } = await params;
    const { status } = await req.json();

    const campaign = await prisma.adCampaign.findFirst({
      where: { id, clinicId },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Kampanya bulunamadı" }, { status: 404 });
    }

    // Update on Meta if connected
    if (campaign.metaCampaignId) {
      try {
        await updateCampaignStatus(clinicId, campaign.metaCampaignId, status);
      } catch (metaError) {
        console.error("Meta status update error:", metaError);
      }
    }

    const updated = await prisma.adCampaign.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update campaign error:", error);
    return NextResponse.json({ error: "Güncelleme hatası" }, { status: 500 });
  }
}
