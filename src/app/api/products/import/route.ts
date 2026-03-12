import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { getExchangeRates, convertToTRYKurus } from "@/lib/exchange-rate";

const VALID_CATEGORIES = ["KOZMETIK", "MEDIKAL", "SARF_MALZEME", "DIGER"];
const VALID_UNITS = ["ADET", "KUTU", "PAKET", "ML", "GR"];
const VALID_CURRENCIES = ["TRY", "USD", "EUR", "GBP"];

function normalizeCategory(value: string): string {
  if (!value) return "DIGER";
  const upper = value.toUpperCase().trim();
  if (VALID_CATEGORIES.includes(upper)) return upper;
  if (upper.includes("KOZMET")) return "KOZMETIK";
  if (upper.includes("MEDIKAL") || upper.includes("TIB")) return "MEDIKAL";
  if (upper.includes("SARF") || upper.includes("MALZEME")) return "SARF_MALZEME";
  return "DIGER";
}

function normalizeUnit(value: string): string {
  if (!value) return "ADET";
  const upper = value.toUpperCase().trim();
  if (VALID_UNITS.includes(upper)) return upper;
  if (upper.includes("KUTU")) return "KUTU";
  if (upper.includes("PAKET")) return "PAKET";
  if (upper === "ML" || upper.includes("MILI")) return "ML";
  if (upper === "GR" || upper.includes("GRAM")) return "GR";
  return "ADET";
}

function generateSku(name: string, index: number): string {
  const prefix = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);
  return `${prefix || "PRD"}-${Date.now().toString(36).slice(-4).toUpperCase()}${index}`;
}

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
    const mappingStr = formData.get("mapping") as string | null;
    const bodyCurrency = formData.get("currency") as string | null;
    const importBrand = formData.get("brand") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
    }

    const mapping: Record<string, string> = mappingStr ? JSON.parse(mappingStr) : {};
    const globalCurrency = bodyCurrency && VALID_CURRENCIES.includes(bodyCurrency.toUpperCase()) ? bodyCurrency.toUpperCase() : null;

    const bytes = await file.arrayBuffer();
    const wb = XLSX.read(bytes, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws);

    if (rawRows.length === 0) {
      return NextResponse.json({ error: "Dosyada veri bulunamadı" }, { status: 400 });
    }

    // If no mapping provided, return preview data
    if (!mappingStr) {
      const columns = Object.keys(rawRows[0]);
      const preview = rawRows.slice(0, 5);
      return NextResponse.json({ columns, preview, totalRows: rawRows.length });
    }

    // Fetch exchange rates for currency conversion
    const rates = await getExchangeRates();

    // Process rows with mapping
    const existingProducts = await prisma.product.findMany({
      where: { clinicId },
      select: { id: true, name: true, sku: true },
    });

    const nameMap = new Map(existingProducts.map((p) => [p.name.toLowerCase().trim(), p]));

    let added = 0;
    let updated = 0;
    let errors = 0;
    let noBrandCount = 0;
    const errorDetails: { row: number; productName: string; reason: string }[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];

      try {
        const name = mapping.name ? String(row[mapping.name] || "").trim() : "";
        if (!name) {
          errorDetails.push({ row: i + 2, productName: "-", reason: "Ürün adı eksik" });
          errors++;
          continue;
        }

        const excelBrand = mapping.brand ? String(row[mapping.brand] || "").trim() || null : null;
        const brand = excelBrand || (importBrand?.trim() || null);
        const category = normalizeCategory(mapping.category ? String(row[mapping.category] || "") : "");
        const unit = normalizeUnit(mapping.unit ? String(row[mapping.unit] || "") : "");
        const rawQuantity = mapping.quantity ? row[mapping.quantity] : undefined;
        const quantity: number | null | undefined = rawQuantity === undefined
          ? undefined
          : (rawQuantity === null || rawQuantity === "" || rawQuantity === undefined)
            ? null
            : Math.max(0, Math.round(Number(rawQuantity) || 0));
        const minStock = mapping.minStock ? Math.max(0, Math.round(Number(row[mapping.minStock]) || 0)) : 0;
        // Use global currency from user selection, fallback to per-row mapping
        const currency = globalCurrency || (() => {
          const rawCurrency = mapping.currency ? String(row[mapping.currency] || "").toUpperCase().trim() : "TRY";
          return VALID_CURRENCIES.includes(rawCurrency) ? rawCurrency : "TRY";
        })();

        const rawPurchaseStr = mapping.purchasePrice ? String(row[mapping.purchasePrice] ?? "").replace(",", ".") : "0";
        const rawPurchasePrice = parseFloat(rawPurchaseStr) || 0;
        if (mapping.purchasePrice && rawPurchaseStr.trim() !== "" && isNaN(parseFloat(rawPurchaseStr))) {
          errorDetails.push({ row: i + 2, productName: name, reason: `Alış fiyatı geçersiz format: "${row[mapping.purchasePrice]}"` });
          errors++;
          continue;
        }
        const rawSaleStr = mapping.salePrice ? String(row[mapping.salePrice] ?? "").replace(",", ".") : "0";
        const salePriceTL = parseFloat(rawSaleStr) || 0;
        if (mapping.salePrice && rawSaleStr.trim() !== "" && isNaN(parseFloat(rawSaleStr))) {
          errorDetails.push({ row: i + 2, productName: name, reason: `Satış fiyatı geçersiz format: "${row[mapping.salePrice]}"` });
          errors++;
          continue;
        }
        const rawPurchasePriceUSD = mapping.purchasePriceUSD ? parseFloat(String(row[mapping.purchasePriceUSD]).replace(",", ".")) || null : null;

        let purchasePriceKurus: number;
        let originalForeignPrice: number | null = null;

        if (currency !== "TRY" && rawPurchasePrice > 0) {
          originalForeignPrice = rawPurchasePrice;
          purchasePriceKurus = convertToTRYKurus(rawPurchasePrice, currency, rates);
          console.log("Kur:", rates.TRY, `${currency} fiyat:`, rawPurchasePrice, "TRY kuruş:", purchasePriceKurus);
        } else {
          purchasePriceKurus = Math.round(rawPurchasePrice * 100);
        }

        if (rawPurchasePriceUSD !== null) {
          originalForeignPrice = rawPurchasePriceUSD;
        }

        const existing = nameMap.get(name.toLowerCase().trim());

        if (existing) {
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              ...(brand !== null && { brand }),
              category,
              unit,
              ...(quantity !== undefined && { currentStock: quantity }),
              minStock,
              currency,
              purchasePrice: purchasePriceKurus,
              purchasePriceUSD: originalForeignPrice,
              salePrice: Math.round(salePriceTL * 100),
            },
          });
          if (!brand) noBrandCount++;
          updated++;
        } else {
          const sku = generateSku(name, i);
          await prisma.product.create({
            data: {
              clinicId,
              name,
              sku,
              ...(brand !== null && { brand }),
              category,
              unit,
              currentStock: quantity !== undefined ? quantity : null,
              minStock,
              currency,
              purchasePrice: purchasePriceKurus,
              purchasePriceUSD: originalForeignPrice,
              salePrice: Math.round(salePriceTL * 100),
            },
          });
          nameMap.set(name.toLowerCase().trim(), { id: "", name, sku });
          if (!brand) noBrandCount++;
          added++;
        }
      } catch (err) {
        const productName = mapping.name ? String(row[mapping.name] || "").trim() : "-";
        const reason = err instanceof Error ? err.message : "Bilinmeyen hata";
        console.error(`Row ${i} import error:`, err);
        errorDetails.push({ row: i + 2, productName, reason });
        errors++;
      }
    }

    return NextResponse.json({ added, updated, errors, total: rawRows.length, noBrandCount, errorDetails });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "İçe aktarma hatası" }, { status: 500 });
  }
}
