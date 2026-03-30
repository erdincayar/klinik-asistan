"use client";

import { useState, useEffect } from "react";
import { getSectorConfig, type SectorLabels, DEFAULT_SECTOR_CONFIG } from "@/lib/sector-config";

/**
 * Kullanıcının klinik sektörüne göre etiket ve konfigürasyon döner.
 * Önce API'den sektör + özel config alır, sonra merge eder.
 */
export function useSectorConfig(): SectorLabels & { loading: boolean; sector: string } {
  const [config, setConfig] = useState<SectorLabels>(DEFAULT_SECTOR_CONFIG);
  const [sector, setSector] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        const base = getSectorConfig(data.sector);
        const custom = data.sectorConfig as Partial<SectorLabels> | null;
        // Custom config override varsa merge et
        if (custom && typeof custom === "object") {
          setConfig({ ...base, ...custom });
        } else {
          setConfig(base);
        }
        setSector(data.sector || "DIGER");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { ...config, loading, sector };
}
