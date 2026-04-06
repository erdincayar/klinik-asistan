import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — list all content
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

    const posts = await prisma.scheduledPost.findMany({
      where: { clinicId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ posts });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

// POST — create content
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

    const body = await req.json();
    const { type, platform, content, threadContent, scheduledAt, occasion } = body;

    if (!content?.trim() && !threadContent) {
      return NextResponse.json({ error: "İçerik gerekli" }, { status: 400 });
    }

    const post = await prisma.scheduledPost.create({
      data: {
        clinicId,
        type: type || "tweet",
        platform: platform || "twitter",
        content: content?.trim() || null,
        threadContent: threadContent ? JSON.stringify(threadContent) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        status: "DRAFT",
        occasion: occasion || null,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

// PATCH — update content
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

    const existing = await prisma.scheduledPost.findFirst({
      where: { id, clinicId },
    });
    if (!existing) return NextResponse.json({ error: "İçerik bulunamadı" }, { status: 404 });

    const data: any = {};
    if (updateData.content !== undefined) data.content = updateData.content;
    if (updateData.threadContent !== undefined) data.threadContent = JSON.stringify(updateData.threadContent);
    if (updateData.type) data.type = updateData.type;
    if (updateData.platform) data.platform = updateData.platform;
    if (updateData.status) {
      data.status = updateData.status;
      if (updateData.status === "APPROVED") {
        data.approvedBy = session.user.email || session.user.name;
        data.approvedAt = new Date();
      }
    }
    if (updateData.scheduledAt) data.scheduledAt = new Date(updateData.scheduledAt);
    if (updateData.occasion !== undefined) data.occasion = updateData.occasion;

    const post = await prisma.scheduledPost.update({
      where: { id },
      data,
    });

    return NextResponse.json(post);
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

// DELETE — delete content
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

    await prisma.scheduledPost.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
