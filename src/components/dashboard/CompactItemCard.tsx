"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Item, WorkStatus } from "@/lib/types";
import {
  WORK_STATUS_META,
  baseDateOf,
  daysAgoFrom,
  domainOf,
  formatDaysAgo,
  isActivelySnoozed,
  isDebugAiSummary,
  parseLinkContent,
  snoozeLeftLabel,
} from "@/lib/items";

type Props = {
  item: Item;
  forgotten: boolean;
  onOpen: (item: Item) => void;
  selectable: boolean;
  selected: boolean;
  onToggleSelected: (checked: boolean) => void;
  selectLabel: string;
  draggable: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragging: boolean;
  onSetWorkStatus: (id: string, status: WorkStatus) => void;
  onSetSnooze: (id: string, days: number | null) => void;
  onDelete: (id: string) => void;
};

function statusIndicator(item: any, forgotten: boolean) {
  const aiStatus = item.ai_status as string | undefined;
  if (aiStatus === "failed") return { label: "AI hata", tone: "danger" as const };
  if (aiStatus === "processing")
    return { label: "AI çalışıyor", tone: "info" as const };
  if (forgotten) return { label: "Unutulmuş", tone: "warn" as const };
  if (isActivelySnoozed(item)) {
    const label = snoozeLeftLabel(item.snoozed_until);
    if (label) return { label, tone: "neutral" as const };
  }
  const workStatus = (item.work_status ?? "later") as WorkStatus;
  if (workStatus !== "later") {
    return { label: WORK_STATUS_META[workStatus].shortLabel, tone: "neutral" as const };
  }
  return null;
}

const TONE_CLASSES: Record<string, string> = {
  danger: "border-red-900/50 bg-red-950/40 text-red-200",
  warn: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  info: "border-sky-400/25 bg-sky-400/10 text-sky-200",
  neutral: "theme-chip text-white/68",
};

export default function CompactItemCard({
  item,
  forgotten,
  onOpen,
  selectable,
  selected,
  onToggleSelected,
  selectLabel,
  draggable,
  onDragStart,
  onDragEnd,
  isDragging,
  onSetWorkStatus,
  onSetSnooze,
  onDelete,
}: Props) {
  const isLink = item.type === "link";
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuOpensUp, setMenuOpensUp] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);

  const { url } = useMemo(
    () => (isLink ? parseLinkContent(item.content) : { url: "", note: "" }),
    [isLink, item.content],
  );

  const baseDate = useMemo(() => baseDateOf(item as any), [item]);
  const daysAgo = useMemo(() => daysAgoFrom(baseDate), [baseDate]);

  const aiSummaryRaw = (item as any).ai_summary as string | null | undefined;
  const aiSummary = useMemo(() => {
    const summary = (aiSummaryRaw ?? "").trim();
    if (!summary || isDebugAiSummary(summary)) return null;
    return summary;
  }, [aiSummaryRaw]);

  const previewLine =
    (item as any).ai_status === "done" && aiSummary
      ? aiSummary
      : isLink
        ? parseLinkContent(item.content).note
        : item.content;

  const cardTitle = item.title || (isLink ? "Başlıksız link" : "Başlıksız not");
  const indicator = statusIndicator(item, forgotten);
  const tags = item.tags ?? [];
  const hasActiveSnooze = isActivelySnoozed(item as any);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <article
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`theme-shell group relative w-full rounded-xl p-4 text-left transition hover:bg-white/[0.06] ${
        menuOpen ? "z-50 overflow-visible" : "z-0 overflow-hidden"
      } ${isDragging ? "scale-[0.99] opacity-60" : ""} ${selected ? "ring-2 ring-cyan-300/40" : ""}`}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        aria-label={`${cardTitle} detayını aç`}
        className="absolute inset-0 z-0 h-full w-full cursor-pointer appearance-none rounded-xl border-0 bg-transparent p-0"
      />

      {selectable ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSelected(!selected);
          }}
          aria-pressed={selected}
          aria-label={selectLabel}
          className="relative z-10 mb-2 -ml-1 -mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/40 hover:bg-black/60"
        >
          <span
            className={`flex h-5 w-5 items-center justify-center rounded border ${
              selected ? "border-cyan-300/60 bg-cyan-300/25" : "border-white/25"
            }`}
          >
            {selected ? "✓" : ""}
          </span>
        </button>
      ) : null}

      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-sm text-white/50"
          >
            {isLink ? "🔗" : "📝"}
          </span>
          <h3 className="min-w-0 line-clamp-2 break-words text-[15px] font-semibold leading-snug text-white">
            {cardTitle}
          </h3>
        </div>

        <div className="relative z-10 shrink-0" ref={menuRef}>
          <button
            ref={menuTriggerRef}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((v) => {
                const next = !v;
                if (next) {
                  // Menu items (including the destructive "Sil" action) must
                  // stay reachable even when the card sits near the bottom of
                  // the viewport — the mobile FAB is fixed above everything in
                  // normal flow, so a menu that always opens downward can
                  // render its lower items underneath it. Measure against the
                  // FAB's own top edge (only present/visible on mobile) rather
                  // than the raw viewport height, which the FAB already eats
                  // into.
                  const rect = menuTriggerRef.current?.getBoundingClientRect();
                  const fab = document.querySelector(
                    ".mobile-fab",
                  ) as HTMLElement | null;
                  // `.mobile-fab` is `position: fixed`, so `offsetParent` is
                  // always null for it regardless of visibility — check
                  // computed display instead (it's `lg:hidden` on desktop).
                  const fabVisible =
                    !!fab && getComputedStyle(fab).display !== "none";
                  const bottomBoundary = fabVisible
                    ? fab!.getBoundingClientRect().top
                    : window.innerHeight;
                  const estimatedMenuHeight = 270;
                  const spaceBelow = rect
                    ? bottomBoundary - rect.bottom
                    : Infinity;
                  setMenuOpensUp(spaceBelow < estimatedMenuHeight);
                }
                return next;
              });
            }}
            aria-label="Daha fazla işlem"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="grid h-9 w-9 place-items-center rounded-lg text-white/50 transition hover:bg-white/[0.08] hover:text-white"
          >
            ⋮
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className={`theme-menu-panel absolute right-0 z-50 w-48 overflow-hidden rounded-xl ${
                menuOpensUp ? "bottom-full mb-1" : "mt-1"
              }`}
            >
              <div className="p-1.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onSetWorkStatus(item.id, "today");
                  }}
                  className="theme-menu-item"
                >
                  Bugüne al
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onSetWorkStatus(item.id, "done");
                  }}
                  className="theme-menu-item mt-0.5"
                >
                  Bitti işaretle
                </button>
                {[7, 14, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onSetSnooze(item.id, days);
                    }}
                    className="theme-menu-item mt-0.5"
                  >
                    {days} gün ertele
                  </button>
                ))}
                {hasActiveSnooze ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onSetSnooze(item.id, null);
                    }}
                    className="theme-menu-item mt-0.5"
                  >
                    Ertelemeyi kaldır
                  </button>
                ) : null}
                <div className="theme-menu-divider my-1.5" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(item.id);
                  }}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-red-300 transition hover:bg-red-950/30"
                >
                  Sil
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {isLink && url ? (
        <div className="mt-1.5 min-w-0 truncate text-xs text-cyan-200/70">
          {domainOf(url)}
        </div>
      ) : null}

      {previewLine ? (
        <p className="mt-1.5 line-clamp-1 min-w-0 break-words text-sm text-white/58">
          {previewLine}
        </p>
      ) : null}

      {tags.length ? (
        <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-1.5">
          {tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="theme-chip max-w-[120px] truncate rounded-md px-2 py-0.5 text-xs text-cyan-50"
            >
              #{tag}
            </span>
          ))}
          {tags.length > 2 ? (
            <span className="text-xs text-white/38">+{tags.length - 2}</span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-white/40">
        <span>{formatDaysAgo(daysAgo)}</span>
        {indicator ? (
          <span
            className={`rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${TONE_CLASSES[indicator.tone]}`}
          >
            {indicator.label}
          </span>
        ) : null}
      </div>
    </article>
  );
}
