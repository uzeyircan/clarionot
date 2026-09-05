"use client";

import type { ForgottenSegment } from "@/lib/items";

type ItemTypeFilter = "all" | "note" | "link";

type Props = {
  title: string;
  itemCount: number;
  activeType: ItemTypeFilter;
  onChangeType: (type: ItemTypeFilter) => void;
  advancedFilterCount: number;
  onOpenFilters: () => void;
  showSelectionToggle: boolean;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  onOpenWeeklySummary: () => void;
  isForgottenView: boolean;
  forgottenSegment: ForgottenSegment;
  onChangeForgottenSegment: (segment: ForgottenSegment) => void;
  forgottenSegmentCounts: Record<ForgottenSegment, number>;
  isPro: boolean | null;
  proForgottenDays: 30 | 60 | 90;
  onChangeProForgottenDays: (days: 30 | 60 | 90) => void;
  forgottenSort: "oldest" | "newest";
  onChangeForgottenSort: (sort: "oldest" | "newest") => void;
};

const FORGOTTEN_SEGMENTS: Array<[ForgottenSegment, string]> = [
  ["all", "Tümü"],
  ["7", "7+ gün"],
  ["30", "30+ gün"],
  ["90", "90+ gün"],
  ["today", "Bugün bak"],
  ["snoozed", "Ertelenenler"],
];

export default function DashboardViewHeader({
  title,
  itemCount,
  activeType,
  onChangeType,
  advancedFilterCount,
  onOpenFilters,
  showSelectionToggle,
  selectionMode,
  onToggleSelectionMode,
  onOpenWeeklySummary,
  isForgottenView,
  forgottenSegment,
  onChangeForgottenSegment,
  forgottenSegmentCounts,
  isPro,
  proForgottenDays,
  onChangeProForgottenDays,
  forgottenSort,
  onChangeForgottenSort,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl">
            {title}
          </h1>
          <p className="mt-0.5 text-xs text-white/46">{itemCount} kayıt</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenWeeklySummary}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/62 transition hover:bg-white/[0.07] hover:text-white sm:min-h-0"
          >
            Özet
          </button>

          {showSelectionToggle ? (
            <button
              type="button"
              onClick={onToggleSelectionMode}
              aria-pressed={selectionMode}
              className={`inline-flex min-h-[44px] items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition sm:min-h-0 ${
                selectionMode
                  ? "accent-border accent-soft accent-text"
                  : "border-white/10 bg-white/[0.03] text-white/62 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              {selectionMode ? "Seçimi bitir" : "Seç"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onOpenFilters}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/62 transition hover:bg-white/[0.07] hover:text-white sm:min-h-0"
          >
            Filtreler{advancedFilterCount > 0 ? ` (${advancedFilterCount})` : ""}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "Tümü"],
            ["note", "Notlar"],
            ["link", "Linkler"],
          ] as Array<[ItemTypeFilter, string]>
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onChangeType(value)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              activeType === value
                ? "bg-white text-[#030406]"
                : "bg-white/[0.055] text-white/68 hover:bg-white/[0.09]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isForgottenView ? (
        <div className="space-y-3 rounded-xl border border-white/10 bg-black/15 p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="scrollbar-hide flex flex-nowrap gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0">
              {FORGOTTEN_SEGMENTS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onChangeForgottenSegment(key)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    forgottenSegment === key
                      ? "accent-gradient"
                      : "bg-white/[0.055] text-white/68 hover:bg-white/[0.09]"
                  }`}
                >
                  {label} ({forgottenSegmentCounts[key] ?? 0})
                </button>
              ))}
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              {isPro === true ? (
                <select
                  value={proForgottenDays}
                  onChange={(e) =>
                    onChangeProForgottenDays(Number(e.target.value) as 30 | 60 | 90)
                  }
                  className="h-8 rounded-lg border border-white/10 bg-[#07090d] px-2 text-xs text-white/82 outline-none focus:border-cyan-200/50"
                  aria-label="Unutulmuş eşiği"
                >
                  <option value={30}>30+ gün</option>
                  <option value={60}>60+ gün</option>
                  <option value={90}>90+ gün</option>
                </select>
              ) : (
                <a
                  href="/pro"
                  className="rounded-lg border border-white/10 bg-[#07090d] px-2 py-1.5 text-[11px] text-white/58 hover:bg-white/[0.06]"
                >
                  7+ gün 🔒
                </a>
              )}

              <select
                value={forgottenSort}
                onChange={(e) => onChangeForgottenSort(e.target.value as "oldest" | "newest")}
                className="h-8 rounded-lg border border-white/10 bg-[#07090d] px-2 text-xs text-white/82 outline-none focus:border-cyan-200/50"
                aria-label="Sırala"
              >
                <option value="oldest">En eski önce</option>
                <option value="newest">En yeni önce</option>
              </select>
            </div>
          </div>

          {isPro === false ? (
            <div className="text-[11px] text-white/56">
              Free planda 7+ gündür bakmadıkların burada görünür. Pro'da 30/60/90+ eşiğini sen
              seçersin —{" "}
              <a href="/pro" className="font-semibold text-cyan-100 underline decoration-cyan-200/30">
                Pro'ya geç
              </a>
              .
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
