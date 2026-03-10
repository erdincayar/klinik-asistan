import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const columnConfigSchema = z.object({
  columns: z.object({
    order: z.array(z.string()),
    hidden: z.array(z.string()),
    customColumns: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(["text", "number", "date", "boolean"]),
      })
    ),
  }),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const config = await prisma.inventoryColumnConfig.findUnique({
      where: { clinicId },
    });

    if (!config) {
      return Response.json({
        columns: {
          order: [
            "brand", "name", "sku", "category", "stock",
            "purchasePriceTRY", "purchasePriceFX", "salePriceTRY",
            "salePriceFX", "profitMargin", "currency", "orderAlert", "actions",
          ],
          hidden: [],
          customColumns: [],
        },
      });
    }

    return Response.json({ columns: config.columns });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = columnConfigSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Geçersiz veri" }, { status: 400 });
    }

    const config = await prisma.inventoryColumnConfig.upsert({
      where: { clinicId },
      update: { columns: parsed.data.columns },
      create: { clinicId, columns: parsed.data.columns },
    });

    return Response.json({ columns: config.columns });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
