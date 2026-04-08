import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const existing = await prisma.scheduledPost.findFirst({
      where: { id: params.id, clinicId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Paylaşım bulunamadı" }, { status: 404 });
    }

    const body = await req.json();
    const updateData: Record<string, any> = {};

    if (body.content !== undefined) updateData.content = body.content;
    if (body.platform !== undefined) updateData.platform = body.platform;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.scheduledAt !== undefined) updateData.scheduledAt = new Date(body.scheduledAt);
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
    if (body.mediaUrls !== undefined) updateData.mediaUrls = body.mediaUrls;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.occasion !== undefined) updateData.occasion = body.occasion;

    const post = await prisma.scheduledPost.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("Update post error:", error);
    return NextResponse.json({ error: "Paylaşım güncellenemedi" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const existing = await prisma.scheduledPost.findFirst({
      where: { id: params.id, clinicId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Paylaşım bulunamadı" }, { status: 404 });
    }

    await prisma.scheduledPost.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete post error:", error);
    return NextResponse.json({ error: "Paylaşım silinemedi" }, { status: 500 });
  }
}
