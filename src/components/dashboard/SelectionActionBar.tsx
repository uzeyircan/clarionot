"use client";

type Props = {
  mode: "forgotten" | "ai";
  selectedCount: number;
  bulkLoading: boolean;
  onMoveToInbox?: () => void;
  onDelete?: () => void;
  onSnooze?: (days: number) => void;
  onEnhanceSelected?: () => void;
  aiEnhancing?: boolean;
};

export default function SelectionActionBar({
  mode,
  selectedCount,
  bulkLoading,
  onMoveToInbox,
  onDelete,
  onSnooze,
  onEnhanceSelected,
  aiEnhancing,
}: Props) {
  const disabled = selectedCount === 0 || bulkLoading;

  return (
    <div className="theme-shell flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3">
      <div className="text-xs text-white/62">
        Seçili: <span className="font-semibold text-white">{selectedCount}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {mode === "forgotten" ? (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={onMoveToInbox}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/78 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Inbox'a al
            </button>
            <select
              disabled={disabled}
              defaultValue=""
              onChange={(e) => {
                const v = Number(e.target.value);
                e.currentTarget.value = "";
                if ([7, 14, 30].includes(v)) onSnooze?.(v);
              }}
              className="rounded-lg border border-white/10 bg-[#07090d] px-2 py-1.5 text-xs font-semibold text-white/78 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <option value="">Ertele ▾</option>
              <option value={7}>7 gün</option>
              <option value={14}>14 gün</option>
              <option value={30}>30 gün</option>
            </select>
            <button
              type="button"
              disabled={disabled}
              onClick={onDelete}
              className="rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-900/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sil
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={disabled || aiEnhancing}
            onClick={onEnhanceSelected}
            className="rounded-lg border border-cyan-200/18 bg-cyan-200/10 px-3 py-1.5 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-200/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {aiEnhancing ? "AI çalışıyor..." : `AI işle (${selectedCount})`}
          </button>
        )}
      </div>
    </div>
  );
}
