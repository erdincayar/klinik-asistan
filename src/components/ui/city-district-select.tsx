"use client";

import { CITY_LIST, getDistricts } from "@/lib/turkey-cities";

interface CitySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CitySelect({ value, onChange, placeholder, className }: CitySelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className || "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"}
    >
      <option value="">{placeholder || "İl seçin..."}</option>
      {CITY_LIST.map((city) => (
        <option key={city} value={city}>{city}</option>
      ))}
    </select>
  );
}

interface DistrictSelectProps {
  city: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DistrictSelect({ city, value, onChange, placeholder, className }: DistrictSelectProps) {
  const districts = getDistricts(city);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={!city}
      className={className || "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-50"}
    >
      <option value="">{city ? (placeholder || "İlçe seçin...") : "Önce il seçin"}</option>
      {districts.map((d) => (
        <option key={d} value={d}>{d}</option>
      ))}
    </select>
  );
}

// Check if a column name suggests it's a city or district field
export function isCityField(columnName: string): boolean {
  const lower = columnName.toLocaleLowerCase("tr-TR");
  return lower === "il" || lower === "şehir" || lower === "city";
}

export function isDistrictField(columnName: string): boolean {
  const lower = columnName.toLocaleLowerCase("tr-TR");
  return lower === "ilçe" || lower === "district" || lower === "semt";
}
