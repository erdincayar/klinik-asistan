import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readFile, readdir, stat } from "fs/promises";
import path from "path";

const VIDEOS_DIR = path.join(process.cwd(), "public", "uploads", "videos");

// GET — list all videos or serve a specific video
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as any).role;
    if (role !== "ADMIN" && role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const file = searchParams.get("file");

    // Serve a specific video file
    if (file) {
      // Security: prevent directory traversal
      const safeName = path.basename(file);
      const filePath = path.join(VIDEOS_DIR, safeName);

      try {
        const buffer = await readFile(filePath);
        const ext = path.extname(safeName).toLowerCase();
        const contentType = ext === ".mp4" ? "video/mp4" : ext === ".webm" ? "video/webm" : "application/octet-stream";

        return new NextResponse(buffer, {
          headers: {
            "Content-Type": contentType,
            "Content-Length": String(buffer.length),
            "Cache-Control": "public, max-age=86400",
          },
        });
      } catch {
        return NextResponse.json({ error: "Video bulunamadı" }, { status: 404 });
      }
    }

    // List all videos
    try {
      const files = await readdir(VIDEOS_DIR);
      const videos = [];

      for (const f of files) {
        if (!f.endsWith(".mp4") && !f.endsWith(".webm")) continue;
        const filePath = path.join(VIDEOS_DIR, f);
        const fileStat = await stat(filePath);
        videos.push({
          name: f,
          url: `/api/admin/marketing/videos?file=${encodeURIComponent(f)}`,
          size: fileStat.size,
          sizeMB: Math.round((fileStat.size / 1024 / 1024) * 100) / 100,
          createdAt: fileStat.birthtime.toISOString(),
        });
      }

      videos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return NextResponse.json({ videos });
    } catch {
      return NextResponse.json({ videos: [] });
    }
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
