// 2026 Türkiye Maaş Hesaplama Motoru
// Kaynak: CottGroup, Kolay IK, EY Turkey, Alomaliye — 2026 parametreleri

// ═══════════════════════════════════════════════════════════
// SABİTLER
// ═══════════════════════════════════════════════════════════

const ASGARI_UCRET_BRUT = 33_030; // TL
const SGK_TAVAN = 297_270; // 9x asgari ücret (2026'da 7.5x'den 9x'e çıktı)

// İşçi kesintileri
const SGK_ISCI_ORANI = 0.14;
const ISSIZLIK_ISCI_ORANI = 0.01;
const DAMGA_VERGISI_ORANI = 0.00759;

// İşveren payları
const SGK_ISVEREN_ORANI = 0.2175; // %21.75
const ISSIZLIK_ISVEREN_ORANI = 0.02;

// Gelir vergisi dilimleri (kümülatif yıllık)
const GELIR_VERGISI_DILIMLERI = [
  { limit: 190_000, rate: 0.15 },
  { limit: 400_000, rate: 0.20 },
  { limit: 1_500_000, rate: 0.27 },
  { limit: 5_300_000, rate: 0.35 },
  { limit: Infinity, rate: 0.40 },
];

// Asgari ücret gelir vergisi istisnası (aylık)
const GV_ISTISNA_MAP: Record<number, number> = {
  1: 4_211.33, 2: 4_211.33, 3: 4_211.33,
  4: 4_211.33, 5: 4_211.33, 6: 4_211.33,
  7: 4_537.75,
  8: 5_615.10, 9: 5_615.10, 10: 5_615.10,
  11: 5_615.10, 12: 5_615.10,
};

// Damga vergisi istisnası (aylık sabit)
const DV_ISTISNA = 250.70;

// ═══════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════════════════════

function calculateProgressiveTax(cumulativeBase: number): number {
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

// ═══════════════════════════════════════════════════════════
// ANA HESAPLAMA
// ═══════════════════════════════════════════════════════════

export interface SalaryResult {
  brut: number;
  sgkIsci: number;
  issizlikIsci: number;
  gelirVergisiMatrah: number;
  gelirVergisi: number;
  damgaVergisi: number;
  net: number;
  sgkIsveren: number;
  issizlikIsveren: number;
  toplamIsverenMaliyet: number; // brüt + sgkIsveren + issizlikIsveren
}

/**
 * Brüt maaştan net maaşa hesaplama
 * @param brut - Brüt maaş (TL)
 * @param ay - Ay numarası (1-12), hesaplama ayı
 * @returns Detaylı maaş hesaplama sonucu
 */
export function brutToNet(brut: number, ay: number = 1): SalaryResult {
  // SGK matrahı (tavana kadar)
  const sgkMatrah = Math.min(brut, SGK_TAVAN);

  // İşçi kesintileri
  const sgkIsci = sgkMatrah * SGK_ISCI_ORANI;
  const issizlikIsci = sgkMatrah * ISSIZLIK_ISCI_ORANI;

  // Gelir vergisi matrahı
  const aylikMatrah = brut - sgkIsci - issizlikIsci;

  // Kümülatif matrah: önceki aylarda aynı maaş alındığı varsayımı
  const oncekiKumMatrah = aylikMatrah * (ay - 1);
  const yeniKumMatrah = oncekiKumMatrah + aylikMatrah;

  // Kümülatif vergi farkı = bu ayın gelir vergisi
  const kumVergiYeni = calculateProgressiveTax(yeniKumMatrah);
  const kumVergiEski = calculateProgressiveTax(oncekiKumMatrah);
  const aylikGelirVergisi = kumVergiYeni - kumVergiEski;

  // Asgari ücret istisnası
  const gvIstisna = GV_ISTISNA_MAP[ay] || 4_211.33;
  const gelirVergisi = Math.max(0, aylikGelirVergisi - gvIstisna);

  // Damga vergisi
  const damgaVergisi = Math.max(0, brut * DAMGA_VERGISI_ORANI - DV_ISTISNA);

  // Net maaş
  const net = brut - sgkIsci - issizlikIsci - gelirVergisi - damgaVergisi;

  // İşveren payları
  const sgkIsveren = sgkMatrah * SGK_ISVEREN_ORANI;
  const issizlikIsveren = sgkMatrah * ISSIZLIK_ISVEREN_ORANI;
  const toplamIsverenMaliyet = brut + sgkIsveren + issizlikIsveren;

  return {
    brut: Math.round(brut * 100) / 100,
    sgkIsci: Math.round(sgkIsci * 100) / 100,
    issizlikIsci: Math.round(issizlikIsci * 100) / 100,
    gelirVergisiMatrah: Math.round(aylikMatrah * 100) / 100,
    gelirVergisi: Math.round(gelirVergisi * 100) / 100,
    damgaVergisi: Math.round(damgaVergisi * 100) / 100,
    net: Math.round(net * 100) / 100,
    sgkIsveren: Math.round(sgkIsveren * 100) / 100,
    issizlikIsveren: Math.round(issizlikIsveren * 100) / 100,
    toplamIsverenMaliyet: Math.round(toplamIsverenMaliyet * 100) / 100,
  };
}

/**
 * Net maaştan brüt maaşa hesaplama (binary search)
 * @param targetNet - Hedef net maaş (TL)
 * @param ay - Ay numarası (1-12)
 * @returns Detaylı maaş hesaplama sonucu
 */
export function netToBrut(targetNet: number, ay: number = 1): SalaryResult {
  let low = targetNet;
  let high = targetNet * 3; // Brüt en fazla 3 katı olabilir
  let best: SalaryResult = brutToNet(high, ay);

  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const result = brutToNet(mid, ay);

    if (Math.abs(result.net - targetNet) < 0.5) {
      best = result;
      break;
    }

    if (result.net < targetNet) {
      low = mid;
    } else {
      high = mid;
    }
    best = result;
  }

  return best;
}

/**
 * Yıllık ortalama net hesaplama (12 ay ortalaması)
 * Farklı aylardaki vergi dilimi değişikliklerini hesaba katar
 */
export function yillikOrtalamaNet(brut: number): number {
  let toplamNet = 0;
  for (let ay = 1; ay <= 12; ay++) {
    toplamNet += brutToNet(brut, ay).net;
  }
  return Math.round((toplamNet / 12) * 100) / 100;
}
