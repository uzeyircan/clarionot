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

  // burada “debug/placeholder/mock” metinlerini yakalıyoruz
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
  className = "",
}: {
  item: Item;
  onOpen: (item: Item) => void;
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

  // ✅ AI fields
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

  // ✅ Summary filtresi: boşsa yok, debug/mock ise yok
  const aiSummary = useMemo(() => {
    const s = (aiSummaryRaw ?? "").trim();
    if (!s) return null;
    if (isDebugAiSummary(s)) return null;
    return s;
  }, [aiSummaryRaw]);

  // ✅ summary gösterebilecek miyiz?
  const showAiSummary = aiStatus === "done" && !!aiSummary;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`w-full overflow-hidden text-left rounded-2xl border border-neutral-800 bg-neutral-950 p-4 hover:bg-neutral-900 transition ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs text-neutral-400 min-w-0 break-words">
          {isLink ? "🔗 Link" : "📝 Not"} ·{" "}
          <span className="text-neutral-300">{formatDaysAgo(daysAgo)}</span>
          <span className="text-neutral-600"> · </span>
          <span className="text-neutral-500">
            {baseDate.toLocaleString("tr-TR")}
          </span>
          {/* ✅ AI STATUS */}
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
        </div>

        {snoozeLabel ? (
          <span className="shrink-0 rounded-full border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[10px] text-neutral-300">
            {snoozeLabel}
          </span>
        ) : null}
      </div>

      {/* TITLE + CATEGORY */}
      <div className="mt-1 flex items-center gap-2 min-w-0">
        <div className="text-sm font-semibold min-w-0 break-words line-clamp-1">
          {item.title || (isLink ? "Başlıksız link" : "Başlıksız not")}
        </div>

        {/* ✅ CATEGORY BADGE (only when AI done & category exists) */}
        {aiStatus === "done" && cat ? (
          <span className="shrink-0 rounded-full border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[10px] text-neutral-300">
            {cat.icon} {cat.label}
          </span>
        ) : null}
      </div>

      {/* ✅ AI SUMMARY (only when done & valid) */}
      {showAiSummary ? (
        <div className="mt-3 relative overflow-hidden rounded-2xl border border-sky-900/30 bg-gradient-to-br from-sky-950/40 to-neutral-950 p-4">
          {/* Glow efekti */}
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[11px] font-medium text-sky-300 tracking-wide">
              ✨ Smart Insight
            </div>

            <div className="mt-2 text-sm text-neutral-100 leading-relaxed line-clamp-4">
              {aiSummary}
            </div>
          </div>
        </div>
      ) : null}

      {/* CONTENT */}
      {isLink ? (
        <div className="mt-2 space-y-1 min-w-0">
          {/* URL */}
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block min-w-0 text-sm text-neutral-200 underline decoration-neutral-700 hover:decoration-neutral-300 break-all"
            >
              {url}
            </a>
          ) : (
            <div className="text-sm text-neutral-400">URL yok</div>
          )}

          {/* Açıklama */}
          {note ? (
            <div className="text-sm text-neutral-300 min-w-0 break-words whitespace-pre-wrap line-clamp-2">
              {note}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-2 text-sm text-neutral-300 min-w-0 break-words whitespace-pre-wrap line-clamp-2">
          {item.content}
        </div>
      )}

      {/* TAGS */}
      {/* TAGS */}
      {item.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-2 min-w-0">
          {item.tags.slice(0, 6).map((t) => (
            <span
              key={t}
              className="max-w-full overflow-hidden text-ellipsis rounded-full
                         border border-neutral-800 bg-neutral-950/60
                         px-2.5 py-1 text-xs text-neutral-200
                         shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]"
            >
              <span className="text-neutral-500">#</span>
              <span className="ml-0.5">{t}</span>
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}
