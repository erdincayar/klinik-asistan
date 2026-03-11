import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
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
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "Genel";
    const notes = (formData.get("notes") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save file
    const uploadDir = path.join(process.cwd(), "uploads", "patients", patientId);
    await mkdir(uploadDir, { recursive: true });
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);
    const fileUrl = `/uploads/patients/${patientId}/${fileName}`;

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

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error("Upload photo error:", error);
    return NextResponse.json({ error: "Fotoğraf yüklenemedi" }, { status: 500 });
  }
}
