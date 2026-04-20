"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  BookOpen,
  Loader2,
  Eye,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import StatusBadge from "@/components/catalog/StatusBadge";

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  updatedAt: string;
  _count: { sourceFiles: number; products: number; generations: number };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CatalogListPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/catalog/projects", {
        cache: "no-store",
      });
      if (res.status === 403) {
        router.push("/dashboard");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Yükleme hatası");
      setProjects(data.projects || []);
    } catch (e: any) {
      toast({
        title: "Hata",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    // Gentle refresh — catches ANALYZING → READY transitions from list view.
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remove(id: string) {
    if (
      !window.confirm(
        "Bu projeyi ve tüm dosyalarını silmek istediğinize emin misiniz?"
      )
    )
      return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/catalog/projects/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Silme hatası");
      }
      setProjects((prev) => (prev || []).filter((p) => p.id !== id));
      toast({ title: "Silindi", description: "Proje silindi." });
    } catch (e: any) {
      toast({
        title: "Hata",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            Katalog Üretici
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            AI ile referans PDF&apos;lerden yeni katalog üretin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={refreshing}
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Yenile
          </Button>
          <Link href="/admin/content-studio/catalog/new">
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Yeni Katalog
            </Button>
          </Link>
        </div>
      </div>

      {/* Body */}
      {projects === null ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl bg-white border border-gray-100"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">
              Henüz katalog projesi yok
            </p>
            <p className="mt-1 text-xs text-gray-400">
              PDF veya ürün fotoğraflarınızla ilk kataloğunuzu birkaç dakikada üretin.
            </p>
            <Link href="/admin/content-studio/catalog/new">
              <Button size="sm" className="mt-5">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                İlk Kataloğu Oluştur
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Proje
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Durum
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Dosya
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Ürün
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Son Güncelleme
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    Aksiyon
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/content-studio/catalog/${p.id}`}
                        className="block"
                      >
                        <div className="font-medium text-gray-900">{p.name}</div>
                        {p.description && (
                          <div className="truncate text-xs text-gray-400 max-w-xs">
                            {p.description}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {p._count.sourceFiles}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {p._count.products}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDate(p.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/content-studio/catalog/${p.id}`}
                          className="rounded-lg bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200"
                          title="Görüntüle"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => remove(p.id)}
                          disabled={deletingId === p.id}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                          title="Sil"
                        >
                          {deletingId === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
