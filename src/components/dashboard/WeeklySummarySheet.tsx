"use client";

import Sheet from "@/components/dashboard/Sheet";
import { WORK_STATUS_META, daysSinceBase } from "@/lib/items";
import type { Item, WorkStatus } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  savedThisWeek: number;
  doneThisWeek: number;
  forgottenCount: number;
  focusItems: Item[];
  onOpenItem: (item: Item) => void;
  onSetWorkStatus: (id: string, status: WorkStatus) => void;
  onOpenForgotten: () => void;
  onOpenToday: () => void;
};

export default function WeeklySummarySheet({
  open,
  onClose,
  savedThisWeek,
  doneThisWeek,
  forgottenCount,
  focusItems,
  onOpenItem,
  onSetWorkStatus,
  onOpenForgotten,
  onOpenToday,
}: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Haftalık özet" desktopWidthClassName="lg:w-[440px]">
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-2">
          {[
            ["Yeni", savedThisWeek],
            ["Biten", doneThisWeek],
            ["Bekleyen", forgottenCount],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/38">
                {label}
              </div>
              <div className="mt-1 text-xl font-semibold text-cyan-100">{value}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onOpenForgotten}
            className="accent-gradient inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-semibold transition hover:opacity-90"
          >
            Unutulanları aç
          </button>
          <button
            type="button"
            onClick={onOpenToday}
            className="inline-flex items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/82 transition hover:bg-white/[0.08] hover:text-white"
          >
            Bugünün kuyruğu
          </button>
        </div>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/42">
            Gündeme alınacaklar
          </div>
          <div className="mt-1 text-xs text-white/46">
            En uzun süredir bekleyen veya zaten işleme alınmış kayıtlar.
          </div>

          <div className="mt-3 grid gap-2">
            {focusItems.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/56">
                Bu hafta gündeme alınacak eski kayıt yok.
              </div>
            ) : (
              focusItems.map((item) => {
                const status = ((item as any).work_status ?? "later") as WorkStatus;
                const age = daysSinceBase(item as any);

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenItem(item)}
                      className="min-w-0 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/38">
                        <span>{item.type === "link" ? "Link" : "Not"}</span>
                        <span>·</span>
                        <span>{age === 0 ? "Bugün" : `${age} gün`}</span>
                        <span>·</span>
                        <span className="text-cyan-100">
                          {WORK_STATUS_META[status].shortLabel}
                        </span>
                      </div>
                      <div className="mt-1 line-clamp-2 text-sm font-semibold text-white">
                        {item.title || "Başlıksız kayıt"}
                      </div>
                    </button>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => onSetWorkStatus(item.id, "today")}
                        className="rounded-lg border border-cyan-200/18 bg-cyan-200/10 px-3 py-1.5 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-200/15"
                      >
                        Bugün
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetWorkStatus(item.id, "done")}
                        className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:bg-white/[0.08]"
                      >
                        Bitti
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
