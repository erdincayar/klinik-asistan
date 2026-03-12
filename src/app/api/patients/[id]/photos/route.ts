import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { id } = await params;

    const photos = await prisma.patientPhoto.findMany({
      where: { patientId: id },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json(photos);
  } catch (error) {
    console.error("Get photos error:", error);
    return NextResponse.json({ error: "Fotoğraflar alınamadı" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { id: patientId } = await params;

    // Hasta'nın clinic'ini bul
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { clinicId: true },
    });
    if (!patient) {
      return NextResponse.json({ error: "Hasta bulunamadı" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "Genel";
    const notes = (formData.get("notes") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
    }

    const fileSizeMB = Math.ceil(file.size / (1024 * 1024));

    // Kota kontrolü
    const clinic = await prisma.clinic.findUnique({
      where: { id: patient.clinicId },
      select: { storageUsedMB: true, storageLimitMB: true },
    });
    if (clinic && (clinic.storageUsedMB + fileSizeMB) > clinic.storageLimitMB) {
      return NextResponse.json(
        { error: "Depolama kotası doldu. Lütfen depolama paketinizi yükseltin." },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save file
    const uploadDir = path.join(process.cwd(), "uploads", "patients", patientId);
    await mkdir(uploadDir, { recursive: true });
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);
    const fileUrl = `/api/uploads/patients/${patientId}/${fileName}`;

    const photo = await prisma.patientPhoto.create({
      data: {
        patientId,
        fileName: file.name,
        fileUrl,
        category,
        notes,
        takenAt: new Date(),
      },
    });

    // storageUsedMB güncelle
    await prisma.clinic.update({
      where: { id: patient.clinicId },
      data: { storageUsedMB: { increment: fileSizeMB } },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error("Upload photo error:", error);
    return NextResponse.json({ error: "Fotoğraf yüklenemedi" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { id: patientId } = await params;
    const { searchParams } = new URL(req.url);
    const photoId = searchParams.get("photoId");

    if (!photoId) {
      return NextResponse.json({ error: "photoId gerekli" }, { status: 400 });
    }

    const photo = await prisma.patientPhoto.findFirst({
      where: { id: photoId, patientId },
    });

    if (!photo) {
      return NextResponse.json({ error: "Fotoğraf bulunamadı" }, { status: 404 });
    }

    // Hasta'nın clinic'ini bul
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { clinicId: true },
    });

    // Delete file from disk
    const fileUrl = photo.fileUrl.replace(/^\/api\/uploads\//, "").replace(/^\/uploads\//, "");
    const filePath = path.join(process.cwd(), "uploads", fileUrl);
    let fileSizeMB = 0;
    if (existsSync(filePath)) {
      const { stat } = await import("fs/promises");
      const stats = await stat(filePath);
      fileSizeMB = Math.ceil(stats.size / (1024 * 1024));
      await unlink(filePath);
    }

    // Delete DB record
    await prisma.patientPhoto.delete({ where: { id: photoId } });

    // storageUsedMB güncelle
    if (patient && fileSizeMB > 0) {
      const clinic = await prisma.clinic.findUnique({
        where: { id: patient.clinicId },
        select: { storageUsedMB: true },
      });
      const newUsed = Math.max(0, (clinic?.storageUsedMB || 0) - fileSizeMB);
      await prisma.clinic.update({
        where: { id: patient.clinicId },
        data: { storageUsedMB: newUsed },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete photo error:", error);
    return NextResponse.json({ error: "Fotoğraf silinemedi" }, { status: 500 });
  }
}
