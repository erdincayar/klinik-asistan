"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users, MessageCircle, TrendingUp, BarChart3, Plus, Trash2,
  Loader2, Check, X, Send, RefreshCw, ExternalLink, Edit,
  Target, Sparkles, ThumbsDown, Eye, Hash,
} from "lucide-react";

interface TargetAccount {
  id: string;
  username: string;
  displayName: string | null;
  xUserId: string | null;
  note: string | null;
}

interface Reply {
  id: string;
  sourceTweetId: string;
  sourceTweetText: string;
  sourceAuthor: string;
  suggestedReply: string;
  status: string;
  sentTweetId: string | null;
  errorMessage: string | null;
  targetAccount: { username: string; displayName: string | null } | null;
  createdAt: string;
}

interface TrendingTopic {
  query: string;
  tweets: Array<{ id: string; text: string; author_id: string; metrics: any }>;
}

interface Stats {
  totalRepliesSent: number;
  weeklyRepliesSent: number;
  totalImpressions: number;
  totalLikes: number;
  totalEngagement: number;
  targetAccountCount: number;
  topReplies: Array<any>;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  SENT: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-red-50 text-red-700",
  REJECTED: "bg-gray-100 text-gray-500",
};

export default function EngagementContent() {
  const [tab, setTab] = useState<"targets" | "replies" | "trending" | "stats">("targets");
  const [targets, setTargets] = useState<TargetAccount[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Add target
  const [showAdd, setShowAdd] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);

  // Reply actions
  const [sendingReply, setSendingReply] = useState<string | null>(null);
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [generatingReplies, setGeneratingReplies] = useState(false);

  // Trending
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [trendingSuggestion, setTrendingSuggestion] = useState<{ tweet: string; reason: string } | null>(null);
  const [suggestingTrend, setSuggestingTrend] = useState(false);

  const fetchTargets = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/marketing/engagement/targets");
      if (res.ok) { const d = await res.json(); setTargets(d.targets || []); }
    } catch {} finally { setLoading(false); }
  }, []);

  const fetchReplies = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/marketing/engagement/replies");
      if (res.ok) { const d = await res.json(); setReplies(d.replies || []); }
    } catch {}
  }, []);

  const fetchTrending = useCallback(async () => {
    setLoadingTrending(true);
    try {
      const res = await fetch("/api/admin/marketing/engagement/trending");
      if (res.ok) { const d = await res.json(); setTrending(d.topics || []); }
    } catch {} finally { setLoadingTrending(false); }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/marketing/engagement/stats");
      if (res.ok) setStats(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchTargets(); fetchReplies(); }, [fetchTargets, fetchReplies]);

  useEffect(() => {
    if (tab === "trending" && trending.length === 0) fetchTrending();
    if (tab === "stats" && !stats) fetchStats();
  }, [tab, trending.length, stats, fetchTrending, fetchStats]);

  async function handleAddTarget() {
    if (!newUsername.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/marketing/engagement/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, note: newNote }),
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error); return; }
      setTargets(prev => [d.target, ...prev]);
      setNewUsername(""); setNewNote(""); setShowAdd(false);
    } catch {} finally { setAdding(false); }
  }

  async function handleDeleteTarget(id: string) {
    if (!confirm("Bu hesabı listeden kaldırmak istiyor musunuz?")) return;
    await fetch("/api/admin/marketing/engagement/targets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setTargets(prev => prev.filter(t => t.id !== id));
  }

  async function handleGenerateReplies(targetId?: string) {
    setGeneratingReplies(true);
    try {
      const res = await fetch("/api/admin/marketing/engagement/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId }),
      });
      const d = await res.json();
      if (res.ok) {
        await fetchReplies();
        if (d.generated === 0) alert("Yeni tweet bulunamadı veya tümü zaten önerilmiş.");
      } else alert(d.error);
    } catch {} finally { setGeneratingReplies(false); }
  }

  async function handleReplyAction(id: string, action: "approve" | "reject") {
    setSendingReply(id);
    try {
      const res = await fetch("/api/admin/marketing/engagement/replies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, editedReply: editingReply === id ? editText : undefined }),
      });
      const d = await res.json();
      if (!res.ok) alert(d.error);
      setEditingReply(null);
      await fetchReplies();
    } catch {} finally { setSendingReply(null); }
  }

  async function handleTrendingSuggest(topic: string, sampleTweets: string) {
    setSuggestingTrend(true);
    setTrendingSuggestion(null);
    try {
      const res = await fetch("/api/admin/marketing/engagement/trending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, sampleTweets }),
      });
      if (res.ok) setTrendingSuggestion(await res.json());
    } catch {} finally { setSuggestingTrend(false); }
  }

  const TABS = [
    { key: "targets" as const, label: "Hedef Hesaplar", icon: Target, count: targets.length },
    { key: "replies" as const, label: "Reply Önerileri", icon: MessageCircle, count: replies.filter(r => r.status === "PENDING").length },
    { key: "trending" as const, label: "Trending", icon: TrendingUp },
    { key: "stats" as const, label: "Rapor", icon: BarChart3 },
  ];

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ TARGETS TAB ═══ */}
      {tab === "targets" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Takip edip reply atacağınız hesaplar</p>
            <button onClick={() => setShowAdd(!showAdd)} className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700">
              <Plus className="h-3 w-3" /> Hesap Ekle
            </button>
          </div>

          {showAdd && (
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 space-y-3">
              <div>
                <label className="text-[11px] font-medium text-gray-600">X Kullanıcı Adı veya URL</label>
                <input
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder="@kullaniciadi veya x.com/kullaniciadi"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-200"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-600">Not (opsiyonel)</label>
                <input
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Neden bu hesabı takip ediyoruz?"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-200"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddTarget} disabled={adding || !newUsername.trim()} className="flex-1 rounded-lg bg-purple-600 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50">
                  {adding ? <Loader2 className="inline h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="inline h-3.5 w-3.5 mr-1" />}
                  Ekle
                </button>
                <button onClick={() => setShowAdd(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">İptal</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : targets.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-xs text-gray-400">Henüz hedef hesap eklenmemiş</p>
            </div>
          ) : (
            <div className="space-y-2">
              {targets.map(t => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
                      <span className="text-sm font-bold text-blue-600">@</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <a href={`https://x.com/${t.username}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-gray-900 hover:text-blue-600">
                          @{t.username}
                        </a>
                        {t.displayName && <span className="text-xs text-gray-400">{t.displayName}</span>}
                        {!t.xUserId && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[9px] text-red-500">Bulunamadı</span>}
                      </div>
                      {t.note && <p className="text-[11px] text-gray-400">{t.note}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleGenerateReplies(t.id)}
                      disabled={generatingReplies || !t.xUserId}
                      className="rounded-lg p-1.5 text-purple-500 hover:bg-purple-50 disabled:opacity-30"
                      title="Reply önerileri üret"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDeleteTarget(t.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500" title="Kaldır">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => handleGenerateReplies()}
                disabled={generatingReplies}
                className="w-full rounded-xl border border-purple-200 bg-purple-50 py-2.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-50"
              >
                {generatingReplies ? <><Loader2 className="inline h-3.5 w-3.5 animate-spin mr-1" /> Tweetler taranıyor...</> : <><RefreshCw className="inline h-3.5 w-3.5 mr-1" /> Tüm Hesapları Tara & Reply Öner</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ REPLIES TAB ═══ */}
      {tab === "replies" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Onayla ve gönder — sadece onayladıkların atılır</p>
            <button
              onClick={() => handleGenerateReplies()}
              disabled={generatingReplies}
              className="inline-flex items-center gap-1 rounded-lg border border-purple-200 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50 disabled:opacity-50"
            >
              {generatingReplies ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Yeni Öneriler Üret
            </button>
          </div>

          {replies.length === 0 ? (
            <div className="py-8 text-center">
              <MessageCircle className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-xs text-gray-400">Henüz reply önerisi yok. Hedef hesap ekleyip taratın.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {replies.map(r => (
                <div key={r.id} className={`rounded-xl border bg-white overflow-hidden ${r.status === "PENDING" ? "border-amber-200" : "border-gray-100"}`}>
                  <div className="p-3 space-y-2">
                    {/* Source tweet */}
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">@{r.sourceAuthor}</span>
                      <p className="text-xs text-gray-600 line-clamp-2">{r.sourceTweetText}</p>
                    </div>
                    {/* Suggested reply */}
                    <div className="rounded-lg bg-purple-50/50 p-2.5">
                      {editingReply === r.id ? (
                        <textarea
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          rows={2}
                          maxLength={280}
                          className="w-full rounded-lg border border-purple-200 px-2 py-1.5 text-xs focus:ring-2 focus:ring-purple-200"
                        />
                      ) : (
                        <p className="text-xs text-purple-900">{r.suggestedReply}</p>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[r.status] || STATUS_COLORS.PENDING}`}>
                        {r.status === "PENDING" ? "Onay bekliyor" : r.status === "SENT" ? "Gönderildi" : r.status === "FAILED" ? "Hata" : "Reddedildi"}
                      </span>
                      {r.status === "PENDING" && (
                        <div className="flex items-center gap-1">
                          {editingReply === r.id ? (
                            <button onClick={() => { setEditingReply(null); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" title="İptal">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button onClick={() => { setEditingReply(r.id); setEditText(r.suggestedReply); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" title="Düzenle">
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleReplyAction(r.id, "reject")}
                            disabled={sendingReply === r.id}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                            title="Reddet"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleReplyAction(r.id, "approve")}
                            disabled={sendingReply === r.id}
                            className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
                            title="Onayla ve Gönder"
                          >
                            {sendingReply === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      )}
                      {r.status === "SENT" && r.sentTweetId && (
                        <a href={`https://x.com/pobyai/status/${r.sentTweetId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline">
                          <ExternalLink className="h-3 w-3" /> Görüntüle
                        </a>
                      )}
                    </div>
                    {r.errorMessage && <p className="text-[10px] text-red-500">{r.errorMessage}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ TRENDING TAB ═══ */}
      {tab === "trending" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Türkiye&apos;de gündem olan konular (son tweetler)</p>
            <button onClick={fetchTrending} disabled={loadingTrending} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              {loadingTrending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Yenile
            </button>
          </div>

          {loadingTrending ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : trending.length === 0 ? (
            <div className="py-8 text-center">
              <TrendingUp className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-xs text-gray-400">Trending konular yüklenemedi</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trending.map((topic, i) => (
                <div key={i} className="rounded-xl border border-gray-100 bg-white overflow-hidden">
                  <div className="flex items-center justify-between border-b border-gray-50 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Hash className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-xs font-semibold text-gray-800">{topic.query}</span>
                      <span className="text-[10px] text-gray-400">{topic.tweets.length} tweet</span>
                    </div>
                    <button
                      onClick={() => handleTrendingSuggest(topic.query, topic.tweets.map(t => t.text).join("\n"))}
                      disabled={suggestingTrend}
                      className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1 text-[11px] font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                    >
                      {suggestingTrend ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      Tweet Öner
                    </button>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-[200px] overflow-y-auto">
                    {topic.tweets.map(t => (
                      <div key={t.id} className="px-4 py-2">
                        <p className="text-[11px] text-gray-600 line-clamp-2">{t.text}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                          <span>{t.metrics?.like_count || 0} like</span>
                          <span>{t.metrics?.retweet_count || 0} RT</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {trendingSuggestion && (
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 space-y-2">
                  <p className="text-[11px] font-medium text-purple-600">AI Tweet Önerisi:</p>
                  <p className="text-sm text-gray-900">{trendingSuggestion.tweet}</p>
                  <p className="text-[10px] text-gray-500 italic">{trendingSuggestion.reason}</p>
                  <p className="text-[10px] text-gray-400">Content Studio&apos;dan yeni içerik olarak ekleyebilirsiniz.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ STATS TAB ═══ */}
      {tab === "stats" && (
        <div className="space-y-4">
          {!stats ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Bu Hafta Reply", value: stats.weeklyRepliesSent, color: "text-purple-600" },
                  { label: "Toplam Reply", value: stats.totalRepliesSent, color: "text-blue-600" },
                  { label: "Toplam Beğeni", value: stats.totalLikes, color: "text-rose-600" },
                  { label: "Hedef Hesap", value: stats.targetAccountCount, color: "text-emerald-600" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-3 text-center">
                    <p className="text-[10px] text-gray-400 uppercase">{s.label}</p>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {stats.topReplies.length > 0 && (
                <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
                  <div className="border-b border-gray-100 px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">En İyi Reply&apos;lar</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {stats.topReplies.map((r: any, i: number) => (
                      <div key={i} className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-semibold text-blue-600">@{r.targetUsername}</span>
                          <span className="text-[10px] text-gray-400">{r.likes} like · {r.impressions} gösterim</span>
                        </div>
                        <p className="text-xs text-gray-600">{r.suggestedReply}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={fetchStats} className="w-full rounded-xl border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                <RefreshCw className="inline h-3.5 w-3.5 mr-1" /> Raporu Yenile
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
