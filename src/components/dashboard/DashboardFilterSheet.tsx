"use client";

import Sheet from "@/components/dashboard/Sheet";
import type { Group, WorkStatusFilter } from "@/lib/items";
import { WORK_STATUS_META } from "@/lib/items";

const AI_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "all", label: "Tümü" },
  { value: "documentation", label: "📘 Doküman" },
  { value: "tool", label: "🛠 Araç" },
  { value: "competitor", label: "🥊 Rakip" },
  { value: "article", label: "📰 Yazı" },
  { value: "inspiration", label: "💡 İlham" },
  { value: "pricing", label: "💵 Fiyat" },
  { value: "other", label: "📌 Diğer" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  groups: Group[];
  activeGroupId: string;
  onChangeGroup: (id: string) => void;
  groupCounts: Record<string, number>;
  activeWorkStatus: WorkStatusFilter;
  onChangeWorkStatus: (status: WorkStatusFilter) => void;
  workStatusCounts: Record<WorkStatusFilter, number>;
  activeAiCategory: string;
  onChangeAiCategory: (category: string) => void;
  aiCategoryCounts: Record<string, number>;
  allTags: string[];
  activeTags: string[];
  onToggleTag: (tag: string) => void;
  onClearAll: () => void;
  activeFilterCount: number;
  isPro: boolean;
  canEnhanceGroup: boolean;
  groupEnhancing: boolean;
  onEnhanceGroup: () => void;
  isForgottenView: boolean;
  proForgottenDays: 30 | 60 | 90;
  onChangeProForgottenDays: (days: 30 | 60 | 90) => void;
  forgottenSort: "oldest" | "newest";
  onChangeForgottenSort: (sort: "oldest" | "newest") => void;
};

export default function DashboardFilterSheet({
  open,
  onClose,
  groups,
  activeGroupId,
  onChangeGroup,
  groupCounts,
  activeWorkStatus,
  onChangeWorkStatus,
  workStatusCounts,
  activeAiCategory,
  onChangeAiCategory,
  aiCategoryCounts,
  allTags,
  activeTags,
  onToggleTag,
  onClearAll,
  activeFilterCount,
  isPro,
  canEnhanceGroup,
  groupEnhancing,
  onEnhanceGroup,
  isForgottenView,
  proForgottenDays,
  onChangeProForgottenDays,
  forgottenSort,
  onChangeForgottenSort,
}: Props) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filtreler"
      desktopWidthClassName="lg:w-[400px]"
      footer={
        <button
          type="button"
          onClick={onClearAll}
          disabled={activeFilterCount === 0}
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/78 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Filtreleri temizle
        </button>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/42">
            Grup
          </div>
          <select
            value={activeGroupId === "forgotten" ? "all" : activeGroupId}
            onChange={(e) => onChangeGroup(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#07090d] px-3 py-2 text-sm text-white/82 outline-none focus:border-cyan-200/50"
          >
            <option value="all">Tüm gruplar</option>
            <option value="inbox">Inbox ({groupCounts["inbox"] ?? 0})</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title} ({groupCounts[g.id] ?? 0})
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-white/34">
            Bu seçim sol taraftaki Gruplar listesiyle aynıdır.
          </p>
        </div>

        {isForgottenView ? (
          <div className="lg:hidden">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/42">
              Unutulmuş eşiği ve sıralama
            </div>
            <div className="flex flex-wrap gap-2">
              {isPro ? (
                <select
                  value={proForgottenDays}
                  onChange={(e) =>
                    onChangeProForgottenDays(Number(e.target.value) as 30 | 60 | 90)
                  }
                  className="h-10 rounded-lg border border-white/10 bg-[#07090d] px-3 text-sm text-white/82 outline-none focus:border-cyan-200/50"
                  aria-label="Unutulmuş eşiği"
                >
                  <option value={30}>30+ gün</option>
                  <option value={60}>60+ gün</option>
                  <option value={90}>90+ gün</option>
                </select>
              ) : (
                <a
                  href="/pro"
                  className="rounded-lg border border-white/10 bg-[#07090d] px-3 py-2 text-sm text-white/58 hover:bg-white/[0.06]"
                >
                  7+ gün 🔒
                </a>
              )}

              <select
                value={forgottenSort}
                onChange={(e) =>
                  onChangeForgottenSort(e.target.value as "oldest" | "newest")
                }
                className="h-10 rounded-lg border border-white/10 bg-[#07090d] px-3 text-sm text-white/82 outline-none focus:border-cyan-200/50"
                aria-label="Sırala"
              >
                <option value="oldest">En eski önce</option>
                <option value="newest">En yeni önce</option>
              </select>
            </div>
          </div>
        ) : null}

        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/42">
            İşleme durumu
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "Hepsi"],
                ...Object.entries(WORK_STATUS_META).map(([key, meta]) => [key, meta.label]),
              ] as Array<[WorkStatusFilter, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => onChangeWorkStatus(key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  activeWorkStatus === key
                    ? "accent-gradient"
                    : "bg-white/[0.055] text-white/68 hover:bg-white/[0.09]"
                }`}
              >
                {label} ({workStatusCounts[key] ?? 0})
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/42">
            AI kategorisi
          </div>
          <div className="flex flex-wrap gap-2">
            {AI_CATEGORIES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onChangeAiCategory(value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  activeAiCategory === value
                    ? "accent-gradient"
                    : "bg-white/[0.055] text-white/68 hover:bg-white/[0.09]"
                }`}
              >
                {label} ({aiCategoryCounts[value] ?? 0})
              </button>
            ))}
          </div>
        </div>

        {allTags.length ? (
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/42">
              Etiketler
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => {
                const active = activeTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggleTag(tag)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "accent-gradient"
                        : "bg-white/[0.055] text-white/68 hover:bg-white/[0.09]"
                    }`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {isPro ? (
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/42">
              AI araçları
            </div>
            <button
              type="button"
              onClick={onEnhanceGroup}
              disabled={!canEnhanceGroup || groupEnhancing}
              className={`w-full rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${
                !canEnhanceGroup || groupEnhancing
                  ? "border-neutral-800 bg-neutral-950 text-neutral-600 cursor-not-allowed"
                  : "border-cyan-200/18 bg-cyan-200/10 text-cyan-50 hover:bg-cyan-200/15"
              }`}
            >
              {groupEnhancing
                ? "Grup işleniyor..."
                : "Bu görünümü AI ile işle"}
            </button>
            {!canEnhanceGroup ? (
              <p className="mt-1 text-[11px] text-white/34">
                Önce Inbox veya bir grup seç.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
