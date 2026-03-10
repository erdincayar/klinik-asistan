import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
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

    const invoice = await prisma.uploadedInvoice.findFirst({
      where: { id, clinicId },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Fatura bulunamadı" }, { status: 404 });
    }

    if (invoice.approved) {
      return NextResponse.json(
        { error: "Onaylanmış fatura silinemez" },
        { status: 400 }
      );
    }

    await prisma.uploadedInvoice.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Fatura silindi" });
  } catch (error) {
    console.error("Delete invoice error:", error);
    return NextResponse.json({ error: "Silme hatası" }, { status: 500 });
  }
}

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

    const invoice = await prisma.uploadedInvoice.findFirst({
      where: { id, clinicId },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Fatura bulunamadı" }, { status: 404 });
    }

    if (invoice.approved) {
      return NextResponse.json(
        { error: "Onaylanmış fatura reddedilemez" },
        { status: 400 }
      );
    }

    await prisma.uploadedInvoice.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    return NextResponse.json({ success: true, message: "Fatura reddedildi" });
  } catch (error) {
    console.error("Reject invoice error:", error);
    return NextResponse.json({ error: "Reddetme hatası" }, { status: 500 });
  }
}
