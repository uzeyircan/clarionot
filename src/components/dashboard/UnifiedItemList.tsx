"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Item, WorkStatus } from "@/lib/types";
import CompactItemCard from "@/components/dashboard/CompactItemCard";

type Props = {
  items: Item[];
  totalItemsCount: number;
  loading: boolean;
  err: string | null;
  onRetry: () => void;
  onOpen: (item: Item) => void;
  isForgotten: (item: Item) => boolean;
  selectionMode: boolean;
  selectedIds: string[];
  onToggleSelected: (id: string, checked: boolean) => void;
  selectLabel: string;
  dragEnabled: boolean;
  draggingItemId: string | null;
  onDragStartItem: (id: string) => (e: React.DragEvent) => void;
  onDragEndItem: () => void;
  onSetWorkStatus: (id: string, status: WorkStatus) => void;
  onSetSnooze: (id: string, days: number | null) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  /** Dedicated copy for a view's empty *baseline* (no extra filters applied) — suppresses the generic "no results" message and its Clear filters button. */
  emptyStateOverride?: { title: string; description: string } | null;
};

function SkeletonCard() {
  return (
    <div className="theme-shell h-[132px] animate-pulse rounded-xl p-4">
      <div className="h-4 w-2/3 rounded bg-white/[0.08]" />
      <div className="mt-3 h-3 w-1/3 rounded bg-white/[0.06]" />
      <div className="mt-2 h-3 w-full rounded bg-white/[0.05]" />
      <div className="mt-4 h-3 w-1/4 rounded bg-white/[0.05]" />
    </div>
  );
}

export default function UnifiedItemList({
  items,
  totalItemsCount,
  loading,
  err,
  onRetry,
  onOpen,
  isForgotten,
  selectionMode,
  selectedIds,
  onToggleSelected,
  selectLabel,
  dragEnabled,
  draggingItemId,
  onDragStartItem,
  onDragEndItem,
  onSetWorkStatus,
  onSetSnooze,
  onDelete,
  onCreateNew,
  onClearFilters,
  hasActiveFilters,
  emptyStateOverride,
}: Props) {
  const reduceMotion = useReducedMotion();

  if (loading) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (err && items.length === 0) {
    return (
      <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-6 text-sm text-red-100">
        <div className="text-base font-semibold text-white">
          Kayıtlar yüklenemedi
        </div>
        <p className="mt-2 max-w-md text-sm leading-6 text-red-200/80">{err}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/15"
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  if (totalItemsCount === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/12 bg-white/[0.035] p-6 text-sm text-white/56 backdrop-blur-xl">
        <div className="text-base font-semibold text-white">Henüz kayıt yok</div>
        <p className="mt-2 max-w-md text-sm leading-6 text-white/52">
          İlk not veya linkini kaydet; fikirler, kararlar ve geri dönmek
          istediğin kaynaklar burada toparlansın.
        </p>
        <button
          type="button"
          onClick={onCreateNew}
          className="mt-4 rounded-lg border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-white/[0.08]"
        >
          Not veya link ekle
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    const title = emptyStateOverride?.title ?? "Bu filtrede kayıt yok";
    const description =
      emptyStateOverride?.description ??
      "Arama veya filtreleri değiştirerek daha fazla kayıt görebilirsin.";
    const showClearButton = !emptyStateOverride && hasActiveFilters;

    return (
      <div className="rounded-xl border border-dashed border-white/12 bg-white/[0.035] p-6 text-sm text-white/56 backdrop-blur-xl">
        <div className="text-base font-semibold text-white">{title}</div>
        <p className="mt-2 max-w-md text-sm leading-6 text-white/52">
          {description}
        </p>
        {showClearButton ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 rounded-lg border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-white/[0.08]"
          >
            Filtreleri temizle
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <motion.div layout={!reduceMotion} className="grid gap-3">
      <AnimatePresence initial={false}>
        {items.map((it) => (
          <motion.div
            key={it.id}
            layout={!reduceMotion}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: reduceMotion ? 0.001 : 0.18 }}
          >
            <CompactItemCard
              item={it}
              forgotten={isForgotten(it)}
              onOpen={onOpen}
              selectable={selectionMode}
              selected={selectedIds.includes(it.id)}
              onToggleSelected={(checked) => onToggleSelected(it.id, checked)}
              selectLabel={selectLabel}
              draggable={dragEnabled}
              onDragStart={dragEnabled ? onDragStartItem(it.id) : undefined}
              onDragEnd={dragEnabled ? onDragEndItem : undefined}
              isDragging={draggingItemId === it.id}
              onSetWorkStatus={onSetWorkStatus}
              onSetSnooze={onSetSnooze}
              onDelete={onDelete}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
