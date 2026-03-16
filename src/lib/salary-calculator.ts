// 2026 Türkiye Maaş Hesaplama Motoru
// Net sabit → brüt her ay değişir (kümülatif vergi dilimi etkisi)
// Brüt sabit → net her ay değişir

// ═══════════════════════════════════════════════════════════
// 2026 SABİTLER
// ═══════════════════════════════════════════════════════════

const ASGARI_UCRET_BRUT = 33_030; // TL
const SGK_TAVAN = ASGARI_UCRET_BRUT * 9; // 297.270 TL

// İşçi kesintileri
const SGK_ISCI_ORANI = 0.14; // %14 (Emeklilik %9 + GSS %5)
const ISSIZLIK_ISCI_ORANI = 0.01; // %1
const DAMGA_VERGISI_ORANI = 0.00759; // binde 7,59

// İşveren payları
const SGK_ISVEREN_TESVIKSIZ = 0.2175; // %21.75
const SGK_ISVEREN_5_PUAN = 0.1675; // %16.75
const SGK_ISVEREN_2_PUAN = 0.1975; // %19.75
const ISSIZLIK_ISVEREN_ORANI = 0.02; // %2

// Gelir vergisi dilimleri (kümülatif yıllık matrah)
const GELIR_VERGISI_DILIMLERI = [
  { limit: 230_000, rate: 0.15 },
  { limit: 580_000, rate: 0.20 },
  { limit: 1_900_000, rate: 0.27 },
  { limit: 4_400_000, rate: 0.35 },
  { limit: Infinity, rate: 0.40 },
];

// Asgari ücret GV istisnası (sabit vergi indirimi, her ay düşülür)
// = asgari ücret matrahı × ilk dilim oranı = 28.075,50 × 0.15 = 4.211,33 TL
const ASGARI_MATRAH = ASGARI_UCRET_BRUT * (1 - SGK_ISCI_ORANI - ISSIZLIK_ISCI_ORANI);
const GV_ISTISNA = Math.round(ASGARI_MATRAH * 0.15 * 100) / 100; // 4.211,33 TL

// Damga vergisi istisnası = asgari ücret brüt × damga oranı = 250,80 TL
const DV_ISTISNA = Math.round(ASGARI_UCRET_BRUT * DAMGA_VERGISI_ORANI * 100) / 100;

// ═══════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════════════════════

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Kümülatif matrah üzerinden artan oranlı gelir vergisi */
function calculateProgressiveTax(cumulativeBase: number): number {
  if (cumulativeBase <= 0) return 0;
  let tax = 0;
  let prevLimit = 0;
  for (const bracket of GELIR_VERGISI_DILIMLERI) {
    if (cumulativeBase <= prevLimit) break;
    const taxableInBracket = Math.min(cumulativeBase, bracket.limit) - prevLimit;
    tax += taxableInBracket * bracket.rate;
    prevLimit = bracket.limit;
  }
  return tax;
}

/** SGK İşveren oranını teşvik tipine göre döndürür */
function getSgkIsverenOrani(tesvik: "YOK" | "5_PUAN" | "2_PUAN" = "5_PUAN"): number {
  switch (tesvik) {
    case "YOK": return SGK_ISVEREN_TESVIKSIZ;
    case "2_PUAN": return SGK_ISVEREN_2_PUAN;
    case "5_PUAN": return SGK_ISVEREN_5_PUAN;
  }
}

// ═══════════════════════════════════════════════════════════
// ANA HESAPLAMA
// ═══════════════════════════════════════════════════════════

export interface SalaryResult {
  ay: number;
  brut: number;
  sgkIsci: number;
  issizlikIsci: number;
  gelirVergisiMatrah: number;
  kumulatifMatrah: number;
  gelirVergisi: number;
  damgaVergisi: number;
  net: number;
  sgkIsveren: number;
  issizlikIsveren: number;
  toplamIsverenMaliyet: number;
}

export interface YillikResult {
  aylar: SalaryResult[];
  yillikBrut: number;
  yillikNet: number;
  yillikIsverenMaliyet: number;
}

export type TesvikTipi = "YOK" | "5_PUAN" | "2_PUAN";

/**
 * Brüt maaştan net maaşa hesaplama (tek ay)
 *
 * 1. SGK İşçi = min(Brüt, SGK Tavan) × %14
 * 2. İşsizlik İşçi = min(Brüt, SGK Tavan) × %1
 * 3. GV Matrahı = Brüt - SGK İşçi - İşsizlik İşçi (tam matrah)
 * 4. Kümülatif GV = vergi(küm. sonra) - vergi(küm. önce)
 * 5. Ödenecek GV = max(0, Kümülatif GV - 4.211,33)  ← asgari ücret istisnası
 * 6. Damga = max(0, Brüt × binde 7,59 - 250,80)      ← DV istisnası
 * 7. Net = Brüt - SGK İşçi - İşsizlik İşçi - GV - Damga
 */
export function brutToNet(
  brut: number,
  ay: number = 1,
  tesvik: TesvikTipi = "5_PUAN",
  kumulatifMatrahOnceki: number = 0
): SalaryResult {
  const sgkMatrah = Math.min(brut, SGK_TAVAN);

  const sgkIsci = sgkMatrah * SGK_ISCI_ORANI;
  const issizlikIsci = sgkMatrah * ISSIZLIK_ISCI_ORANI;

  // GV matrahı (tam matrah, istisna düşülmez)
  const gvMatrahi = brut - sgkIsci - issizlikIsci;

  // Kümülatif matrah
  const kumulatifMatrahSonra = kumulatifMatrahOnceki + gvMatrahi;

  // Bu ayın brüt gelir vergisi (kümülatif fark yöntemi)
  const brutGV =
    calculateProgressiveTax(kumulatifMatrahSonra) -
    calculateProgressiveTax(kumulatifMatrahOnceki);

  // Asgari ücret GV istisnası düşülür (sabit 4.211,33 TL/ay)
  const gelirVergisi = Math.max(0, round2(brutGV - GV_ISTISNA));

  // Damga vergisi (asgari ücret DV istisnası düşülür)
  const damgaVergisi = Math.max(0, round2(brut * DAMGA_VERGISI_ORANI - DV_ISTISNA));

  // Net maaş
  const net = brut - sgkIsci - issizlikIsci - gelirVergisi - damgaVergisi;

  // İşveren payları
  const sgkIsverenOrani = getSgkIsverenOrani(tesvik);
  const sgkIsveren = sgkMatrah * sgkIsverenOrani;
  const issizlikIsveren = sgkMatrah * ISSIZLIK_ISVEREN_ORANI;
  const toplamIsverenMaliyet = brut + sgkIsveren + issizlikIsveren;

  return {
    ay,
    brut: round2(brut),
    sgkIsci: round2(sgkIsci),
    issizlikIsci: round2(issizlikIsci),
    gelirVergisiMatrah: round2(gvMatrahi),
    kumulatifMatrah: round2(kumulatifMatrahSonra),
    gelirVergisi: round2(gelirVergisi),
    damgaVergisi: round2(damgaVergisi),
    net: round2(net),
    sgkIsveren: round2(sgkIsveren),
    issizlikIsveren: round2(issizlikIsveren),
    toplamIsverenMaliyet: round2(toplamIsverenMaliyet),
  };
}

/**
 * Net maaştan brüt maaşa hesaplama (tek ay, Newton iterasyonu)
 * Net sabit tutulur, o ayın brütü hesaplanır.
 */
export function netToBrut(
  hedefNet: number,
  ay: number = 1,
  tesvik: TesvikTipi = "5_PUAN",
  kumulatifMatrahOnceki: number = 0
): SalaryResult {
  let brut = hedefNet / 0.85;

  for (let i = 0; i < 200; i++) {
    const result = brutToNet(brut, ay, tesvik, kumulatifMatrahOnceki);
    const fark = result.net - hedefNet;

    if (Math.abs(fark) < 0.01) {
      return result;
    }

    brut = brut - fark;
  }

  return brutToNet(brut, ay, tesvik, kumulatifMatrahOnceki);
}

/**
 * Brüt sabit — yıllık 12 ay hesaplama
 * Her ay aynı brüt, net azalır (kümülatif vergi dilimi etkisi)
 */
export function yillikFromBrut(
  brut: number,
  tesvik: TesvikTipi = "5_PUAN"
): YillikResult {
  const aylar: SalaryResult[] = [];
  let kumulatifMatrah = 0;

  for (let ay = 1; ay <= 12; ay++) {
    const result = brutToNet(brut, ay, tesvik, kumulatifMatrah);
    aylar.push(result);
    kumulatifMatrah = result.kumulatifMatrah;
  }

  return {
    aylar,
    yillikBrut: round2(aylar.reduce((sum, a) => sum + a.brut, 0)),
    yillikNet: round2(aylar.reduce((sum, a) => sum + a.net, 0)),
    yillikIsverenMaliyet: round2(aylar.reduce((sum, a) => sum + a.toplamIsverenMaliyet, 0)),
  };
}

/**
 * Net sabit — yıllık 12 ay hesaplama
 * Her ay aynı net, brüt artar (kümülatif vergi dilimi etkisi)
 */
export function yillikFromNet(
  hedefNet: number,
  tesvik: TesvikTipi = "5_PUAN"
): YillikResult {
  const aylar: SalaryResult[] = [];
  let kumulatifMatrah = 0;

  for (let ay = 1; ay <= 12; ay++) {
    const result = netToBrut(hedefNet, ay, tesvik, kumulatifMatrah);
    aylar.push(result);
    kumulatifMatrah = result.kumulatifMatrah;
  }

  return {
    aylar,
    yillikBrut: round2(aylar.reduce((sum, a) => sum + a.brut, 0)),
    yillikNet: round2(aylar.reduce((sum, a) => sum + a.net, 0)),
    yillikIsverenMaliyet: round2(aylar.reduce((sum, a) => sum + a.toplamIsverenMaliyet, 0)),
  };
}
