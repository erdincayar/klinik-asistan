import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const createSchema = z.object({
  action: z.literal("create"),
  name: z.string().min(1, "Belge adı gerekli"),
  category: z.enum(["hire", "terminate", "other"]).default("other"),
  content: z.string().min(1, "Belge içeriği gerekli"),
});

const deleteSchema = z.object({
  action: z.literal("delete"),
  id: z.string().min(1, "Belge ID gerekli"),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source");

    const where: any = { clinicId };
    if (source === "AI" || source === "UPLOAD") {
      where.source = source;
    }

    const documents = await prisma.hrDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("HR documents GET error:", error);
    return NextResponse.json({ error: "Belgeler alınamadı" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const body = await req.json();

    if (body.action === "delete") {
      const parsed = deleteSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Geçersiz veri", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const doc = await prisma.hrDocument.findFirst({
        where: { id: parsed.data.id, clinicId },
      });

      if (!doc) {
        return NextResponse.json({ error: "Belge bulunamadı" }, { status: 404 });
      }

      // If uploaded file, delete from disk
      if (doc.source === "UPLOAD" && doc.fileUrl) {
        const fileRelPath = doc.fileUrl.replace(/^\/api\/uploads\//, "");
        const filePath = path.join(process.cwd(), "uploads", fileRelPath);
        if (existsSync(filePath)) {
          const { stat } = await import("fs/promises");
          const stats = await stat(filePath);
          const fileSizeMB = Math.ceil(stats.size / (1024 * 1024));
          await unlink(filePath);

          // Update storage
          if (fileSizeMB > 0) {
            const clinic = await prisma.clinic.findUnique({
              where: { id: clinicId },
              select: { storageUsedMB: true },
            });
            const newUsed = Math.max(0, (clinic?.storageUsedMB || 0) - fileSizeMB);
            await prisma.clinic.update({
              where: { id: clinicId },
              data: { storageUsedMB: newUsed },
            });
          }
        }
      }

      await prisma.hrDocument.delete({ where: { id: doc.id } });

      return NextResponse.json({ success: true });
    }

    if (body.action === "create") {
      const parsed = createSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Geçersiz veri", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const doc = await prisma.hrDocument.create({
        data: {
          clinicId,
          name: parsed.data.name,
          category: parsed.data.category,
          source: "AI",
          content: parsed.data.content,
        },
      });

      return NextResponse.json(doc, { status: 201 });
    }

    return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });
  } catch (error) {
    console.error("HR documents POST error:", error);
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
  }
}
