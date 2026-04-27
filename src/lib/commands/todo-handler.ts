/**
 * Telegram-side handler for personal to-do list commands.
 *
 *   /yap <görev>          — yeni todo ekle (not yok)
 *   /yap <görev> | <not>  — todo + not
 *   /liste                — aktif todo'ları listele (numaralandırılmış)
 *   /yapildi <num|kelime> — listeden numaraya göre veya başlık eşleşen
 *                          todo'yu COMPLETED yap
 *   /sil <num|kelime>     — todo'yu sil
 *
 * Kullanıcının clinicId+userId'si bot tarafında çözülmüş olmalı.
 */

import { prisma } from "@/lib/prisma";

export interface TodoCommandResult {
  matched: boolean;       // bu komut bizim komutumuz muydu
  response?: string;       // gönderilecek metin
}

const ACTIVE_LIST_LIMIT = 50;

function fmtList(items: { title: string; note: string | null }[]): string {
  if (items.length === 0) return "📋 Aktif yapılacak iş yok.";
  return [
    "📋 *Yapılacaklar*",
    ...items.map((t, i) => {
      const head = `${i + 1}. ${t.title}`;
      return t.note ? `${head}\n   📝 ${t.note}` : head;
    }),
  ].join("\n");
}

export async function handleTodoCommand(
  text: string,
  ctx: { clinicId: string; userId: string }
): Promise<TodoCommandResult> {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return { matched: false };

  const space = trimmed.indexOf(" ");
  const cmdRaw = (space === -1 ? trimmed.slice(1) : trimmed.slice(1, space)).toLowerCase();
  const arg = space === -1 ? "" : trimmed.slice(space + 1).trim();

  // Aliases
  const isAdd = ["yap", "todo", "ekle"].includes(cmdRaw);
  const isList = ["liste", "yapilacaklar", "yapılacaklar", "todos"].includes(cmdRaw);
  const isDone = ["yapildi", "yapıldı", "tamam", "done"].includes(cmdRaw);
  const isDelete = ["sil", "kaldir", "kaldır"].includes(cmdRaw);

  if (!isAdd && !isList && !isDone && !isDelete) {
    return { matched: false };
  }

  // ── /yap <görev> [| not]
  if (isAdd) {
    if (!arg) {
      return {
        matched: true,
        response: "ℹ️ Kullanım: `/yap Süt al`  veya  `/yap Süt al | 1L laktozsuz`",
      };
    }
    const pipe = arg.indexOf("|");
    const title = (pipe === -1 ? arg : arg.slice(0, pipe)).trim().slice(0, 300);
    const note = pipe === -1 ? null : arg.slice(pipe + 1).trim().slice(0, 4000) || null;

    if (!title) {
      return { matched: true, response: "❌ Başlık boş olamaz" };
    }

    await prisma.todo.create({
      data: {
        clinicId: ctx.clinicId,
        userId: ctx.userId,
        title,
        note,
        source: "TELEGRAM",
      },
    });
    return { matched: true, response: `✅ Eklendi: ${title}${note ? `\n📝 ${note}` : ""}` };
  }

  // ── /liste
  if (isList) {
    const items = await prisma.todo.findMany({
      where: { clinicId: ctx.clinicId, userId: ctx.userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: ACTIVE_LIST_LIMIT,
      select: { title: true, note: true },
    });
    return { matched: true, response: fmtList(items) };
  }

  // ── /yapildi N  veya  /yapildi <kelime>
  // ── /sil N      veya  /sil <kelime>
  if (isDone || isDelete) {
    if (!arg) {
      return {
        matched: true,
        response: isDone
          ? "ℹ️ Kullanım: `/yapildi 2`  ya da  `/yapildi süt`"
          : "ℹ️ Kullanım: `/sil 2`  ya da  `/sil süt`",
      };
    }

    const items = await prisma.todo.findMany({
      where: { clinicId: ctx.clinicId, userId: ctx.userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: ACTIVE_LIST_LIMIT,
    });

    let target: typeof items[number] | null = null;
    const idx = parseInt(arg, 10);
    if (!Number.isNaN(idx) && idx >= 1 && idx <= items.length) {
      target = items[idx - 1];
    } else {
      const q = arg.toLowerCase();
      target =
        items.find((t) => t.title.toLowerCase().includes(q)) ??
        items.find((t) => (t.note ?? "").toLowerCase().includes(q)) ??
        null;
    }

    if (!target) {
      return {
        matched: true,
        response: `❌ Eşleşen yapılacak iş yok. /liste yazıp numaraya göre dene.`,
      };
    }

    if (isDone) {
      await prisma.todo.update({
        where: { id: target.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      return { matched: true, response: `✅ Tamamlandı: ${target.title}` };
    } else {
      await prisma.todo.delete({ where: { id: target.id } });
      return { matched: true, response: `🗑 Silindi: ${target.title}` };
    }
  }

  return { matched: false };
}
