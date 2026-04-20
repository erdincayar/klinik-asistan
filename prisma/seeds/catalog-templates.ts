/**
 * Catalog template seed.
 *
 * Seeds the "Natural Stone Modern" template (and any future system
 * templates) into the CatalogTemplate table. Idempotent — safe to
 * rerun; upserts by slug.
 *
 * Run (from project root, on VPS or any host with DATABASE_URL):
 *   npx tsx prisma/seeds/catalog-templates.ts
 *
 * Notes:
 * - htmlPath / cssPath are stored as paths RELATIVE to the
 *   python-services/catalog-service/templates/ directory; the
 *   FastAPI generator resolves them against its own `TEMPLATES_ROOT`.
 * - thumbnailPath is served from /public/catalog/templates/* so the
 *   Next.js UI can display previews without touching FastAPI.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SeedTemplate {
  slug: string;
  name: string;
  sector: string;
  htmlPath: string;
  cssPath: string;
  thumbnailPath: string | null;
  isSystem: boolean;
}

const templates: SeedTemplate[] = [
  {
    slug: "natural-stone-modern",
    name: "Natural Stone — Modern & Minimal",
    sector: "NATURAL_STONE",
    htmlPath: "natural-stone-modern/main.html.j2",
    cssPath: "natural-stone-modern/styles.css",
    thumbnailPath: "/catalog/templates/natural-stone-modern.png",
    isSystem: true,
  },
];

async function main() {
  let created = 0;
  let updated = 0;

  for (const t of templates) {
    const existing = await prisma.catalogTemplate.findUnique({
      where: { slug: t.slug },
    });

    if (existing) {
      await prisma.catalogTemplate.update({
        where: { slug: t.slug },
        data: {
          name: t.name,
          sector: t.sector,
          htmlPath: t.htmlPath,
          cssPath: t.cssPath,
          thumbnailPath: t.thumbnailPath,
          isSystem: t.isSystem,
        },
      });
      updated++;
      console.log(`[seed] updated  ${t.slug}`);
    } else {
      await prisma.catalogTemplate.create({
        data: {
          slug: t.slug,
          name: t.name,
          sector: t.sector,
          htmlPath: t.htmlPath,
          cssPath: t.cssPath,
          thumbnailPath: t.thumbnailPath,
          isSystem: t.isSystem,
        },
      });
      created++;
      console.log(`[seed] created  ${t.slug}`);
    }
  }

  console.log(`\n[seed] done. created=${created} updated=${updated}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
