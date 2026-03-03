import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadImage } from "@/lib/meta-ads";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save locally
    const uploadDir = path.join(process.cwd(), "uploads", "ads", clinicId);
    await mkdir(uploadDir, { recursive: true });
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);
    const localUrl = `/uploads/ads/${clinicId}/${fileName}`;

    // Try uploading to Meta
    let imageHash = null;
    try {
      const result = await uploadImage(clinicId, buffer);
      if (result.images) {
        const firstKey = Object.keys(result.images)[0];
        imageHash = result.images[firstKey]?.hash;
      }
    } catch {
      // Continue with local URL only
    }

    return NextResponse.json({ url: localUrl, imageHash });
  } catch (error) {
    console.error("Upload image error:", error);
    return NextResponse.json({ error: "Yükleme hatası" }, { status: 500 });
  }
}
