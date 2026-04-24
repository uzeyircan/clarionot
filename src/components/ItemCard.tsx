"use client";

import React, { useMemo } from "react";
import type { Item } from "@/lib/types";

function parseLinkContent(content: string) {
  const raw = (content ?? "").trim();
  if (!raw) return { url: "", note: "" };

  const parts = raw.split(/\n\s*\n/);
  const url = (parts[0] ?? "").trim();
  const note = parts.slice(1).join("\n\n").trim();
  return { url, note };
}

function baseDateOf(item: any) {
  return new Date(item.last_viewed_at ?? item.created_at);
}

function daysAgoFrom(date: Date) {
  const ms = Date.now() - date.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function formatDaysAgo(days: number) {
  if (days <= 0) return "bugün";
  if (days === 1) return "1 gün önce";
  return `${days} gün önce`;
}

function snoozeLeftLabel(iso?: string | null) {
  if (!iso) return null;
  const until = new Date(iso).getTime();
  const diff = until - Date.now();
  if (diff <= 0) return null;

  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  return days <= 1 ? "Erteleme: 1g kaldı" : `Erteleme: ${days}g kaldı`;
}

function categoryMeta(category?: string | null) {
  const value = (category ?? "").toLowerCase();
  switch (value) {
    case "documentation":
      return { label: "Doküman", icon: "📘" };
    case "inspiration":
      return { label: "İlham", icon: "💡" };
    case "tool":
      return { label: "Araç", icon: "🛠" };
    case "pricing":
      return { label: "Fiyat", icon: "💵" };
    case "competitor":
      return { label: "Rakip", icon: "🥊" };
    case "article":
      return { label: "Yazı", icon: "📰" };
    case "other":
      return { label: "Diğer", icon: "📌" };
    default:
      return null;
  }
}

function isDebugAiSummary(summary: string) {
  const lower = summary.toLowerCase();
  return (
    lower.includes("ai is disabled") ||
    lower.includes("set ai_enabled") ||
    lower.includes("openai_api_key") ||
    lower.includes("generate real summary") ||
    lower.includes("mock")
  );
}

export default function ItemCard({
  item,
  onOpen,
  onUndoAi,
  canUndoAi = false,
  onRegenerateAi,
  className = "",
}: {
  item: Item;
  onOpen: (item: Item) => void;
  onUndoAi?: (itemId: string) => void;
  canUndoAi?: boolean;
  onRegenerateAi?: (itemId: string) => void;
  className?: string;
}) {
  const isLink = item.type === "link";

  const { url, note } = useMemo(
    () => (isLink ? parseLinkContent(item.content) : { url: "", note: "" }),
    [isLink, item.content],
  );

  const baseDate = useMemo(() => baseDateOf(item as any), [item]);
  const daysAgo = useMemo(() => daysAgoFrom(baseDate), [baseDate]);
  const snoozeLabel = useMemo(
    () => snoozeLeftLabel((item as any).snoozed_until),
    [item],
  );

  const aiStatus = (item as any).ai_status as
    | "pending"
    | "processing"
    | "done"
    | "failed"
    | "disabled"
    | string
    | undefined;

  const aiSummaryRaw = (item as any).ai_summary as string | null | undefined;
  const aiCategory = (item as any).ai_category as string | null | undefined;

  const cat = useMemo(() => categoryMeta(aiCategory), [aiCategory]);
  const aiSummary = useMemo(() => {
    const summary = (aiSummaryRaw ?? "").trim();
    if (!summary) return null;
    if (isDebugAiSummary(summary)) return null;
    return summary;
  }, [aiSummaryRaw]);

  const showAiSummary = aiStatus === "done" && !!aiSummary;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`theme-shell group relative w-full overflow-hidden rounded-xl p-5 text-left shadow-[0_24px_70px_rgba(0,0,0,0.24)] transition hover:bg-white/[0.07] ${className}`}
    >
      <div className="pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full accent-soft opacity-80 blur-3xl transition group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-3">
        <div className="relative z-10 min-w-0 break-words text-[10px] font-bold uppercase tracking-widest text-white/42">
          {isLink ? "🔗 Link" : "📝 Not"} ·{" "}
          <span className="accent-text">{formatDaysAgo(daysAgo)}</span>
          <span className="text-neutral-600"> · </span>
          <span className="text-neutral-500">
            {baseDate.toLocaleString("tr-TR")}
          </span>

          {aiStatus === "processing" ? (
            <span className="theme-chip ml-2 rounded-md px-2 py-0.5 text-[10px] text-white/62">
              AI çalışıyor
            </span>
          ) : aiStatus === "done" ? (
            <span className="theme-chip ml-2 rounded-md px-2 py-0.5 text-[10px] text-white/62">
              AI hazır
            </span>
          ) : aiStatus === "failed" ? (
            <span className="ml-2 rounded-full border border-red-900 bg-neutral-950 px-2 py-0.5 text-[10px] text-red-300">
              AI hatası
            </span>
          ) : aiStatus === "disabled" ? (
            <span className="theme-chip ml-2 rounded-md px-2 py-0.5 text-[10px] text-white/46">
              AI kapalı
            </span>
          ) : null}

          {(aiStatus === "done" || aiStatus === "failed") && onRegenerateAi ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRegenerateAi(item.id);
              }}
              className="ml-2 rounded-full border border-sky-900/40 bg-sky-950/30 px-2 py-0.5 text-[10px] text-sky-200 transition hover:bg-sky-900/30"
              title="AI özetini yeniden üret"
            >
              ↻
            </button>
          ) : null}

          {canUndoAi && onUndoAi ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onUndoAi(item.id);
              }}
              className="ml-2 rounded-full border border-amber-900/40 bg-amber-950/30 px-2 py-0.5 text-[10px] text-amber-200 transition hover:bg-amber-900/30"
              title="AI değişikliklerini geri al"
            >
              Geri al
            </button>
          ) : null}
        </div>

        {snoozeLabel ? (
          <span className="theme-chip shrink-0 rounded-md px-2 py-0.5 text-[10px] text-white/62">
            {snoozeLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-1 flex min-w-0 items-center gap-2">
        <div className="line-clamp-1 min-w-0 break-words text-base font-semibold leading-snug text-white">
          {item.title || (isLink ? "Başlıksız link" : "Başlıksız not")}
        </div>

        {aiStatus === "done" && cat ? (
          <span className="theme-accent-chip shrink-0 rounded-md px-2 py-0.5 text-[10px]">
            {cat.icon} {cat.label}
          </span>
        ) : null}
      </div>

      {isLink ? (
        <div className="mt-2 min-w-0 space-y-1">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="block min-w-0 break-all text-sm text-cyan-100 underline decoration-cyan-200/30 hover:decoration-cyan-100"
            >
              {url}
            </a>
          ) : (
            <div className="text-sm text-white/52">URL yok</div>
          )}

          {note ? (
            <div className="line-clamp-2 min-w-0 break-words whitespace-pre-wrap text-sm text-white/56">
              {note}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-2 line-clamp-2 min-w-0 break-words whitespace-pre-wrap text-sm text-white/56">
          {item.content}
        </div>
      )}

      {showAiSummary ? (
        <div className="mt-3 rounded-md border border-dashed border-white/8 bg-black/10 px-3 py-2.5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">
            <span className="theme-accent-chip rounded-sm px-1.5 py-0.5 text-[9px] leading-none">
              AI
            </span>
            Akıllı özet
          </div>
          <div className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-white/58">
            {aiSummary}
          </div>
        </div>
      ) : null}

      {item.tags?.length ? (
        <div className="mt-3 flex min-w-0 flex-wrap gap-2">
          {item.tags.slice(0, 6).map((tag) => (
            <span
              key={tag}
              className="theme-chip max-w-full overflow-hidden rounded-md px-2.5 py-1 text-xs text-cyan-50 text-ellipsis shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]"
            >
              <span className="text-cyan-200/60">#</span>
              <span className="ml-0.5">{tag}</span>
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}
