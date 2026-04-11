"use client";

import React, { useMemo } from "react";
import type { Item } from "@/lib/types";

function parseLinkContent(content: string) {
  const raw = (content ?? "").trim();
  if (!raw) return { url: "", note: "" };

  // URL \n\n açıklama
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
  const d = Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
  return d;
}

function formatDaysAgo(d: number) {
  if (d <= 0) return "bugün";
  if (d === 1) return "1 gün önce";
  return `${d} gün önce`;
}

function snoozeLeftLabel(iso?: string | null) {
  if (!iso) return null;
  const until = new Date(iso).getTime();
  const diff = until - Date.now();
  if (diff <= 0) return null;

  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  return days <= 1 ? "Snooze: 1g kaldı" : `Snooze: ${days}g kaldı`;
}

function categoryMeta(category?: string | null) {
  const c = (category ?? "").toLowerCase();
  switch (c) {
    case "documentation":
      return { label: "Docs", icon: "📘" };
    case "inspiration":
      return { label: "Inspo", icon: "💡" };
    case "tool":
      return { label: "Tool", icon: "🛠" };
    case "pricing":
      return { label: "Pricing", icon: "💵" };
    case "competitor":
      return { label: "Competitor", icon: "🥊" };
    case "article":
      return { label: "Article", icon: "📰" };
    case "other":
      return { label: "Other", icon: "📌" };
    default:
      return null;
  }
}

function isDebugAiSummary(s: string) {
  const lower = s.toLowerCase();

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

  const { url, note } = useMemo(() => {
    return isLink ? parseLinkContent(item.content) : { url: "", note: "" };
  }, [isLink, item.content]);

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
    const s = (aiSummaryRaw ?? "").trim();
    if (!s) return null;
    if (isDebugAiSummary(s)) return null;
    return s;
  }, [aiSummaryRaw]);

  const showAiSummary = aiStatus === "done" && !!aiSummary;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`group relative w-full overflow-hidden rounded-xl border border-[#3d4a3e]/20 bg-[#2a2a2a]/40 p-5 text-left shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-2xl transition hover:border-emerald-300/25 hover:bg-[#353534]/55 ${className}`}
    >
      <div className="pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full bg-emerald-300/5 blur-3xl transition group-hover:bg-emerald-300/10" />
      <div className="flex items-start justify-between gap-3">
        <div className="relative z-10 min-w-0 break-words text-[10px] font-bold uppercase tracking-widest text-[#e5e2e1]/40">
          {isLink ? "🔗 Link" : "📝 Not"} ·{" "}
          <span className="text-emerald-300">{formatDaysAgo(daysAgo)}</span>
          <span className="text-neutral-600"> · </span>
          <span className="text-neutral-500">
            {baseDate.toLocaleString("tr-TR")}
          </span>
          {aiStatus === "processing" ? (
            <span className="ml-2 rounded-full border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[10px] text-neutral-300">
              AI…
            </span>
          ) : aiStatus === "done" ? (
            <span className="ml-2 rounded-full border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[10px] text-neutral-300">
              AI
            </span>
          ) : aiStatus === "failed" ? (
            <span className="ml-2 rounded-full border border-red-900 bg-neutral-950 px-2 py-0.5 text-[10px] text-red-300">
              AI failed
            </span>
          ) : aiStatus === "disabled" ? (
            <span className="ml-2 rounded-full border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[10px] text-neutral-400">
              AI off
            </span>
          ) : null}
          {(aiStatus === "done" || aiStatus === "failed") && onRegenerateAi ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRegenerateAi(item.id);
              }}
              className="ml-2 rounded-full border border-sky-900/40 bg-sky-950/30 px-2 py-0.5 text-[10px] text-sky-200 hover:bg-sky-900/30 transition"
              title="AI yeniden üret"
            >
              ↻
            </button>
          ) : null}
          {canUndoAi && onUndoAi ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUndoAi(item.id);
              }}
              className="ml-2 rounded-full border border-amber-900/40 bg-amber-950/30 px-2 py-0.5 text-[10px] text-amber-200 hover:bg-amber-900/30 transition"
              title="AI sonucunu geri al"
            >
              Undo
            </button>
          ) : null}
        </div>

        {snoozeLabel ? (
          <span className="shrink-0 rounded-full border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[10px] text-neutral-300">
            {snoozeLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-1 flex items-center gap-2 min-w-0">
        <div className="min-w-0 break-words text-base font-semibold leading-snug text-[#e5e2e1] line-clamp-1">
          {item.title || (isLink ? "Başlıksız link" : "Başlıksız not")}
        </div>

        {aiStatus === "done" && cat ? (
          <span className="shrink-0 rounded-full border border-[#3d4a3e]/30 bg-[#0e0e0e] px-2 py-0.5 text-[10px] text-emerald-200">
            {cat.icon} {cat.label}
          </span>
        ) : null}
      </div>

      {showAiSummary ? (
        <div className="relative mt-3 overflow-hidden rounded-xl border border-teal-300/25 bg-gradient-to-br from-teal-300/10 to-[#0e0e0e] p-4">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-teal-300/10 blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[11px] font-medium tracking-wide text-teal-300">
              ✨ Smart Insight
            </div>

            <div className="mt-2 text-sm leading-relaxed text-[#e5e2e1] line-clamp-4">
              {aiSummary}
            </div>
          </div>
        </div>
      ) : null}

      {isLink ? (
        <div className="mt-2 space-y-1 min-w-0">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block min-w-0 break-all text-sm text-teal-200 underline decoration-teal-300/30 hover:decoration-teal-200"
            >
              {url}
            </a>
          ) : (
            <div className="text-sm text-[#bccabb]">URL yok</div>
          )}

          {note ? (
            <div className="min-w-0 break-words whitespace-pre-wrap text-sm text-[#bccabb] line-clamp-2">
              {note}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-2 min-w-0 break-words whitespace-pre-wrap text-sm text-[#bccabb] line-clamp-2">
          {item.content}
        </div>
      )}

      {item.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-2 min-w-0">
          {item.tags.slice(0, 6).map((t) => (
            <span
              key={t}
              className="max-w-full overflow-hidden text-ellipsis rounded
                         bg-[#353534]
                         px-2.5 py-1 text-xs text-emerald-200
                         shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]"
            >
              <span className="text-emerald-300/60">#</span>
              <span className="ml-0.5">{t}</span>
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}
