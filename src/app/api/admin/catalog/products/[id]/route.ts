import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/catalog/auth";

/**
 * PATCH /api/admin/catalog/products/[id]
 * Allowed fields: name, description, category, price, currency,
 *                 technicalSpecs, imageStoragePath, order, status.
 *
 * Tenant-scoped: must belong to caller's clinic (via project).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  const product = await prisma.catalogProduct.findFirst({
    where: { id, project: { clinicId: ctx.clinicId } },
    include: { project: { select: { id: true, status: true } } },
  });
  if (!product) {
    return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  }
  if (product.project.status === "GENERATING") {
    return NextResponse.json(
      { error: "Üretim devam ederken ürün düzenlenemez" },
      { status: 409 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const data: any = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (body.description !== undefined) data.description = body.description || null;
  if (body.category !== undefined) data.category = body.category || null;
  if (body.currency !== undefined) data.currency = body.currency || null;
  if (body.price !== undefined) {
    const n = body.price === null ? null : Number(body.price);
    if (n !== null && !Number.isFinite(n)) {
      return NextResponse.json({ error: "Geçersiz fiyat" }, { status: 400 });
    }
    data.price = n;
  }
  if (body.technicalSpecs !== undefined && body.technicalSpecs !== null) {
    if (typeof body.technicalSpecs !== "object") {
      return NextResponse.json(
        { error: "technicalSpecs obje olmalı" },
        { status: 400 }
      );
    }
    data.technicalSpecs = body.technicalSpecs;
  }
  if (body.imageStoragePath !== undefined) {
    // validate existence of the source file for this project
    if (body.imageStoragePath) {
      const file = await prisma.catalogSourceFile.findFirst({
        where: {
          projectId: product.projectId,
          storagePath: body.imageStoragePath,
          fileType: "PRODUCT_IMAGE",
        },
        select: { id: true },
      });
      if (!file) {
        return NextResponse.json(
          { error: "Bu projede o görsel yok" },
          { status: 400 }
        );
      }
    }
    data.imageStoragePath = body.imageStoragePath || null;
  }
  if (body.order !== undefined) {
    const n = Number(body.order);
    if (!Number.isFinite(n)) {
      return NextResponse.json({ error: "Geçersiz sıra" }, { status: 400 });
    }
    data.order = Math.max(0, Math.floor(n));
  }
  if (typeof body.status === "string") {
    if (!["DRAFT", "REVIEWED", "APPROVED"].includes(body.status)) {
      return NextResponse.json({ error: "Geçersiz status" }, { status: 400 });
    }
    data.status = body.status;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Güncellenecek alan yok" },
      { status: 400 }
    );
  }

  const updated = await prisma.catalogProduct.update({
    where: { id },
    data,
  });
  return NextResponse.json({ product: updated });
}

/**
 * DELETE /api/admin/catalog/products/[id]
 * Removes a single product. Does NOT touch the source image file.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  const product = await prisma.catalogProduct.findFirst({
    where: { id, project: { clinicId: ctx.clinicId } },
    include: { project: { select: { status: true } } },
  });
  if (!product) {
    return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  }
  if (product.project.status === "GENERATING") {
    return NextResponse.json(
      { error: "Üretim devam ederken ürün silinemez" },
      { status: 409 }
    );
  }

  await prisma.catalogProduct.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
