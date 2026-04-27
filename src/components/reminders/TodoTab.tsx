"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Check,
  Trash2,
  Loader2,
  StickyNote,
  Undo2,
  ListChecks,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface TodoRow {
  id: string;
  title: string;
  note: string | null;
  status: "ACTIVE" | "COMPLETED" | string;
  source: "WEB" | "TELEGRAM" | "WHATSAPP" | string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const SOURCE_LABEL: Record<string, string> = {
  WEB: "Web",
  TELEGRAM: "Telegram",
  WHATSAPP: "WhatsApp",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TodoTab() {
  const [active, setActive] = useState<TodoRow[]>([]);
  const [completed, setCompleted] = useState<TodoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Add form
  const [newTitle, setNewTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [adding, setAdding] = useState(false);

  // Note edit
  const [editingNoteFor, setEditingNoteFor] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Section toggle
  const [showCompleted, setShowCompleted] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/todos", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setActive(data.active || []);
        setCompleted(data.completed || []);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function addTodo() {
    const title = newTitle.trim();
    if (!title) return;
    setAdding(true);
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, note: newNote.trim() || undefined, source: "WEB" }),
      });
      if (res.ok) {
        const { todo } = await res.json();
        setActive((prev) => [todo, ...prev]);
        setNewTitle("");
        setNewNote("");
        setShowNote(false);
      }
    } finally { setAdding(false); }
  }

  async function complete(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      if (res.ok) {
        const { todo } = await res.json();
        setActive((prev) => prev.filter((t) => t.id !== id));
        setCompleted((prev) => [todo, ...prev]);
      }
    } finally { setBusyId(null); }
  }

  async function reactivate(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      if (res.ok) {
        const { todo } = await res.json();
        setCompleted((prev) => prev.filter((t) => t.id !== id));
        setActive((prev) => [todo, ...prev]);
      }
    } finally { setBusyId(null); }
  }

  async function remove(id: string) {
    if (!window.confirm("Bu görevi silmek istiyor musunuz?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      if (res.ok) {
        setActive((prev) => prev.filter((t) => t.id !== id));
        setCompleted((prev) => prev.filter((t) => t.id !== id));
      }
    } finally { setBusyId(null); }
  }

  async function saveNote(id: string) {
    setSavingNote(true);
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteDraft.trim() || null }),
      });
      if (res.ok) {
        const { todo } = await res.json();
        setActive((prev) => prev.map((t) => (t.id === id ? todo : t)));
        setCompleted((prev) => prev.map((t) => (t.id === id ? todo : t)));
        setEditingNoteFor(null);
        setNoteDraft("");
      }
    } finally { setSavingNote(false); }
  }

  function renderRow(t: TodoRow, isCompleted: boolean) {
    const editing = editingNoteFor === t.id;
    return (
      <div
        key={t.id}
        className={`rounded-lg border bg-white px-3 py-2.5 transition ${
          isCompleted ? "border-gray-100 opacity-70" : "border-gray-200"
        }`}
      >
        <div className="flex items-start gap-2.5">
          <button
            onClick={() => (isCompleted ? reactivate(t.id) : complete(t.id))}
            disabled={busyId === t.id}
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
              isCompleted
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-gray-300 hover:border-emerald-400"
            }`}
            title={isCompleted ? "Aktif yap" : "Tamamlandı işaretle"}
          >
            {busyId === t.id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : isCompleted ? (
              <Check className="h-3 w-3" />
            ) : null}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p
                className={`text-sm ${
                  isCompleted ? "line-through text-gray-500" : "text-gray-900 font-medium"
                }`}
              >
                {t.title}
              </p>
              <div className="flex items-center gap-1 shrink-0">
                {t.source && t.source !== "WEB" && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                    {SOURCE_LABEL[t.source] ?? t.source}
                  </span>
                )}
                {isCompleted && (
                  <button
                    onClick={() => reactivate(t.id)}
                    disabled={busyId === t.id}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100"
                    title="Aktife al"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => remove(t.id)}
                  disabled={busyId === t.id}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  title="Sil"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Note display / edit */}
            {editing ? (
              <div className="mt-2 space-y-1.5">
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  rows={2}
                  placeholder="Not (opsiyonel)"
                  className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs"
                  maxLength={4000}
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => saveNote(t.id)} disabled={savingNote}>
                    {savingNote ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="mr-1 h-3 w-3" />
                    )}
                    Kaydet
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditingNoteFor(null); setNoteDraft(""); }}
                  >
                    İptal
                  </Button>
                </div>
              </div>
            ) : t.note ? (
              <button
                onClick={() => { setEditingNoteFor(t.id); setNoteDraft(t.note ?? ""); }}
                className="mt-1 flex items-start gap-1 text-left text-xs text-gray-500 hover:text-gray-700"
              >
                <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                <span className="whitespace-pre-wrap">{t.note}</span>
              </button>
            ) : !isCompleted ? (
              <button
                onClick={() => { setEditingNoteFor(t.id); setNoteDraft(""); }}
                className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-indigo-600"
              >
                <Plus className="h-3 w-3" />
                Not ekle
              </button>
            ) : null}

            <p className="mt-1 text-[10px] text-gray-400">
              {isCompleted ? `Tamamlandı: ${fmtDate(t.completedAt)}` : `Eklendi: ${fmtDate(t.createdAt)}`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-indigo-500" />
            <p className="text-sm font-semibold text-gray-900">Yeni Yapılacak</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <Input
              value={newTitle}
              placeholder="örn: Akşam fatura kontrolü yap"
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  addTodo();
                }
              }}
              maxLength={300}
              className="flex-1"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNote(!showNote)}
                title="Not ekle"
              >
                <StickyNote className="mr-1 h-3.5 w-3.5" />
                {showNote ? "Notu gizle" : "Not"}
              </Button>
              <Button onClick={addTodo} disabled={adding || !newTitle.trim()} size="sm">
                {adding ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="mr-1 h-3.5 w-3.5" />
                )}
                Ekle
              </Button>
            </div>
          </div>
          {showNote && (
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={2}
              placeholder="Not (opsiyonel)"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              maxLength={4000}
            />
          )}
          <p className="text-[11px] text-gray-400">
            Telegram&apos;dan da ekleyebilirsiniz: <code>/yap akşam fatura kontrolü</code>{" "}
            ya da <code>/yap akşam fatura | hızlı kontrol</code>
          </p>
        </CardContent>
      </Card>

      {/* Active list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Aktif ({active.length})
          </p>
        </div>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-white border border-gray-100" />
            ))}
          </div>
        ) : active.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-gray-400">
              <ListChecks className="mx-auto mb-2 h-6 w-6 text-gray-300" />
              Hiç yapılacak iş yok. Yukarıdan ekleyebilirsin.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {active.map((t) => renderRow(t, false))}
          </div>
        )}
      </div>

      {/* Completed (collapsible) */}
      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Tamamlananlar ({completed.length})
            <span className="text-gray-400 normal-case font-normal">
              {showCompleted ? "(gizle)" : "(göster)"}
            </span>
          </button>
          {showCompleted && (
            <div className="space-y-2">{completed.map((t) => renderRow(t, true))}</div>
          )}
        </div>
      )}
    </div>
  );
}
