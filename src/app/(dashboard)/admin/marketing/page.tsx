"use client";

import { useEffect, useState } from "react";
import { Plus, Send, Trash2, Check, Clock, AlertCircle, Twitter, Instagram, Edit, Calendar, Sparkles, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";

interface Post {
  id: string;
  type: string;
  platform: string;
  content: string | null;
  threadContent: string | null;
  scheduledAt: string;
  postedAt: string | null;
  status: string;
  occasion: string | null;
  externalPostId: string | null;
  errorMessage: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: "Taslak", color: "bg-gray-100 text-gray-700", icon: Edit },
  APPROVED: { label: "Onaylı", color: "bg-blue-100 text-blue-700", icon: Check },
  SCHEDULED: { label: "Zamanlandı", color: "bg-purple-100 text-purple-700", icon: Clock },
  POSTED: { label: "Paylaşıldı", color: "bg-emerald-100 text-emerald-700", icon: Check },
  FAILED: { label: "Hata", color: "bg-red-100 text-red-700", icon: AlertCircle },
  CANCELLED: { label: "İptal", color: "bg-gray-100 text-gray-500", icon: AlertCircle },
};

const PLATFORM_ICONS: Record<string, any> = { twitter: Twitter, instagram: Instagram };
const TYPE_LABELS: Record<string, string> = { tweet: "Tweet", thread: "Thread", reel: "Reel", carousel: "Carousel", tiktok: "TikTok", story: "Story" };
const DAYS = ["Pzr", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

export default function AdminMarketingPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Create form
  const [form, setForm] = useState({
    type: "tweet",
    platform: "twitter",
    content: "",
    threadPosts: [""],
    scheduledAt: "",
    occasion: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPosts(); }, []);

  async function fetchPosts() {
    try {
      const res = await fetch("/api/admin/marketing");
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch {} finally { setLoading(false); }
  }

  async function handleCreate() {
    setSaving(true);
    try {
      const body: any = {
        type: form.type,
        platform: form.platform,
        content: form.type === "thread" ? form.threadPosts[0] : form.content,
        scheduledAt: form.scheduledAt || new Date().toISOString(),
        occasion: form.occasion || undefined,
      };
      if (form.type === "thread") {
        body.threadContent = form.threadPosts.filter(t => t.trim());
      }
      const res = await fetch("/api/admin/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await fetchPosts();
        setShowCreate(false);
        setForm({ type: "tweet", platform: "twitter", content: "", threadPosts: [""], scheduledAt: "", occasion: "" });
      }
    } catch {} finally { setSaving(false); }
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/admin/marketing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchPosts();
  }

  async function handlePublish(id: string) {
    setPublishing(id);
    try {
      const res = await fetch("/api/admin/marketing/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Tweet başarıyla paylaşıldı!");
      } else {
        alert(`Hata: ${data.error || "Bilinmeyen hata"}`);
      }
      fetchPosts();
    } catch {} finally { setPublishing(null); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu içeriği silmek istediğinize emin misiniz?")) return;
    await fetch("/api/admin/marketing", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchPosts();
  }

  const filteredPosts = tab === "all" ? posts : posts.filter(p => p.status === tab.toUpperCase());

  // Weekly calendar
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">AI Content Studio</h1>
          <p className="text-xs text-gray-500">İçerik oluştur, zamanla, paylaş</p>
        </div>
        <div className="flex items-center gap-2">
          {posts.length === 0 && (
            <Button variant="outline" size="sm" onClick={async () => {
              setSeeding(true);
              await fetch("/api/admin/marketing/seed", { method: "POST" });
              await fetchPosts();
              setSeeding(false);
            }} disabled={seeding}>
              {seeding ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1 h-3.5 w-3.5" />}
              Örnek İçe Aktar
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={async () => {
            setGenerating(true);
            const res = await fetch("/api/admin/marketing/generate", { method: "POST" });
            const data = await res.json();
            if (res.ok) alert(`${data.created} içerik AI ile oluşturuldu!`);
            else alert(`Hata: ${data.error}`);
            await fetchPosts();
            setGenerating(false);
          }} disabled={generating}>
            {generating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
            AI ile Üret
          </Button>
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="mr-1 h-3.5 w-3.5" /> Oluştur
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Taslak", count: posts.filter(p => p.status === "DRAFT").length, color: "text-gray-600" },
          { label: "Onaylı", count: posts.filter(p => p.status === "APPROVED").length, color: "text-blue-600" },
          { label: "Zamanlandı", count: posts.filter(p => p.status === "SCHEDULED").length, color: "text-purple-600" },
          { label: "Paylaşıldı", count: posts.filter(p => p.status === "POSTED").length, color: "text-emerald-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-gray-400 uppercase">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly Calendar */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Haftalık Takvim</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-t">
            {weekDays.map((day, i) => {
              const dayStr = day.toISOString().split("T")[0];
              const dayPosts = posts.filter(p => p.scheduledAt?.startsWith(dayStr));
              const isToday = dayStr === today.toISOString().split("T")[0];
              return (
                <div key={i} className={`border-r last:border-0 p-2 min-h-[80px] ${isToday ? "bg-[#EEF2FF]/30" : ""}`}>
                  <p className={`text-[10px] font-semibold ${isToday ? "text-[#4F46E5]" : "text-gray-400"}`}>
                    {DAYS[day.getDay()]} {day.getDate()}
                  </p>
                  <div className="mt-1 space-y-1">
                    {dayPosts.map(p => {
                      const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.DRAFT;
                      return (
                        <div key={p.id} className={`rounded px-1.5 py-0.5 text-[9px] font-medium truncate ${cfg.color}`}>
                          {p.content?.slice(0, 25) || "Thread"}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Content List */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto">
          <TabsList className="w-max sm:w-auto">
            <TabsTrigger value="all" className="text-xs">Tümü ({posts.length})</TabsTrigger>
            <TabsTrigger value="draft" className="text-xs">Taslak</TabsTrigger>
            <TabsTrigger value="approved" className="text-xs">Onaylı</TabsTrigger>
            <TabsTrigger value="posted" className="text-xs">Paylaşıldı</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={tab}>
          {loading ? (
            <p className="text-sm text-gray-400 py-8 text-center">Yükleniyor...</p>
          ) : filteredPosts.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">Henüz içerik yok</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowCreate(true)}>
                <Plus className="mr-1 h-3 w-3" /> İlk İçeriği Oluştur
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPosts.map(post => {
                const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.DRAFT;
                const StatusIcon = cfg.icon;
                const PlatformIcon = PLATFORM_ICONS[post.platform] || Twitter;
                return (
                  <Card key={post.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <PlatformIcon className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-[10px] font-medium text-gray-500 uppercase">{TYPE_LABELS[post.type] || post.type}</span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
                              <StatusIcon className="h-2.5 w-2.5" /> {cfg.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-3">
                            {post.content || (post.threadContent ? `Thread (${JSON.parse(post.threadContent).length} tweet)` : "—")}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                            <span>{formatDate(post.scheduledAt)}</span>
                            {post.occasion && <span>· {post.occasion}</span>}
                            {post.postedAt && <span className="text-emerald-500">· Paylaşıldı: {formatDate(post.postedAt)}</span>}
                            {post.errorMessage && <span className="text-red-500">· Hata</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {post.status === "DRAFT" && (
                            <>
                              <button onClick={() => updateStatus(post.id, "APPROVED")} className="rounded-lg bg-blue-50 p-1.5 text-blue-600 hover:bg-blue-100" title="Onayla">
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              {post.platform === "twitter" && (
                                <button onClick={async () => { await updateStatus(post.id, "APPROVED"); handlePublish(post.id); }} disabled={publishing === post.id} className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50" title="Onayla & Paylaş">
                                  <Send className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </>
                          )}
                          {(post.status === "APPROVED" || post.status === "SCHEDULED") && post.platform === "twitter" && (
                            <button onClick={() => handlePublish(post.id)} disabled={publishing === post.id} className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50" title="Şimdi Paylaş">
                              <Send className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => handleDelete(post.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500" title="Sil">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Yeni İçerik</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Platform</Label>
                  <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="twitter">X (Twitter)</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tür</Label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="tweet">Tweet</option>
                    <option value="thread">Thread</option>
                    <option value="reel">Reel</option>
                    <option value="carousel">Carousel</option>
                    <option value="story">Story</option>
                  </select>
                </div>
              </div>

              {form.type === "thread" ? (
                <div className="space-y-2">
                  <Label className="text-xs">Thread İçerikleri</Label>
                  {form.threadPosts.map((t, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-xs text-gray-400 pt-2 shrink-0">{i + 1}/</span>
                      <textarea
                        value={t}
                        onChange={e => {
                          const updated = [...form.threadPosts];
                          updated[i] = e.target.value;
                          setForm({ ...form, threadPosts: updated });
                        }}
                        placeholder={`Tweet ${i + 1}...`}
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        maxLength={280}
                      />
                    </div>
                  ))}
                  <button onClick={() => setForm({ ...form, threadPosts: [...form.threadPosts, ""] })} className="text-xs text-[#4F46E5] hover:underline">
                    + Tweet Ekle
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs">İçerik</Label>
                  <textarea
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
                    placeholder="İçerik yazın..."
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    maxLength={form.platform === "twitter" ? 280 : 2200}
                  />
                  <p className="text-right text-[10px] text-gray-400">
                    {form.content.length}/{form.platform === "twitter" ? 280 : 2200}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Zamanlama</Label>
                  <Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Etiket (opsiyonel)</Label>
                  <Input value={form.occasion} onChange={e => setForm({ ...form, occasion: e.target.value })} placeholder="Özel gün, kampanya..." />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleCreate} disabled={saving} className="flex-1">
                  {saving ? "Kaydediliyor..." : "Taslak Olarak Kaydet"}
                </Button>
                <Button variant="outline" onClick={() => setShowCreate(false)}>İptal</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
