export const STORAGE_PACKAGES_LIST = [
  {
    id: "free",
    name: "Ücretsiz",
    price: 0,
    displayPrice: "₺0",
    sizeMB: 100,
    description: "Başlangıç için 100 MB depolama",
  },
  {
    id: "starter",
    name: "Starter",
    price: 1900,
    displayPrice: "₺19/ay",
    sizeMB: 2048,
    description: "2 GB depolama alanı",
  },
  {
    id: "professional",
    name: "Professional",
    price: 4900,
    displayPrice: "₺49/ay",
    sizeMB: 10240,
    description: "10 GB depolama alanı",
  },
  {
    id: "business",
    name: "Business",
    price: 12900,
    displayPrice: "₺129/ay",
    sizeMB: 51200,
    description: "50 GB depolama alanı",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 89900,
    displayPrice: "₺899/ay",
    sizeMB: 512000,
    description: "500 GB depolama alanı",
  },
] as const;

export type StoragePackageId = (typeof STORAGE_PACKAGES_LIST)[number]["id"];

/** Satın alınabilir paketler (free hariç) */
export const PURCHASABLE_STORAGE_PACKAGES = STORAGE_PACKAGES_LIST.filter(
  (p) => p.id !== "free"
);
