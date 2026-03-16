import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc", ".jpg", ".jpeg", ".png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string) || "";
    const category = (formData.get("category") as string) || "other";

    if (!file) {
      return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
    }

    if (!name.trim()) {
      return NextResponse.json({ error: "Belge adı gerekli" }, { status: 400 });
    }

    // Extension check
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Desteklenmeyen dosya formatı. Desteklenen: ${ALLOWED_EXTENSIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Size check
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Dosya boyutu 10 MB'den büyük olamaz" },
        { status: 400 }
      );
    }

    const fileSizeMB = Math.ceil(file.size / (1024 * 1024));

    // Storage quota check
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { storageUsedMB: true, storageLimitMB: true },
    });

    if (clinic && (clinic.storageUsedMB + fileSizeMB) > clinic.storageLimitMB) {
      return NextResponse.json(
        { error: "Depolama kotası doldu. Lütfen depolama paketinizi yükseltin." },
        { status: 413 }
      );
    }

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "uploads", "hr", clinicId);
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${Date.now()}_${file.name}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const fileUrl = `/api/uploads/hr/${clinicId}/${fileName}`;

    // Create DB record
    const doc = await prisma.hrDocument.create({
      data: {
        clinicId,
        name: name.trim(),
        category,
        source: "UPLOAD",
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
      },
    });

    // Update storage usage
    await prisma.clinic.update({
      where: { id: clinicId },
      data: { storageUsedMB: { increment: fileSizeMB } },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error("HR document upload error:", error);
    return NextResponse.json({ error: "Dosya yüklenemedi" }, { status: 500 });
  }
}
