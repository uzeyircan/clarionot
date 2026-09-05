"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Textarea from "@/components/Textarea";
import TagInput from "@/components/TagInput";
import Sheet from "@/components/dashboard/Sheet";
import type { Item, WorkStatus } from "@/lib/types";
import type { Group, ItemDraft } from "@/lib/items";
import {
  WORK_STATUS_META,
  canUndoAi,
  categoryMeta,
  isActivelySnoozed,
  isDebugAiSummary,
  joinLinkContent,
  parseLinkContent,
  snoozeLeftLabel,
} from "@/lib/items";

type Props = {
  open: boolean;
  onClose: () => void;
  item: Item | null;
  draft: ItemDraft;
  onChangeDraft: (draft: ItemDraft) => void;
  groups: Group[];
  onSave: () => void;
  onDelete: (id: string) => void;
  onSetWorkStatus: (id: string, status: WorkStatus) => void;
  onSetSnooze: (id: string, days: number | null) => void;
  onRegenerateAi: (id: string) => void;
  onUndoAi: (id: string) => void;
  regeneratingItemId: string | null;
};

export default function ItemDetailSheet({
  open,
  onClose,
  item,
  draft,
  onChangeDraft,
  groups,
  onSave,
  onDelete,
  onSetWorkStatus,
  onSetSnooze,
  onRegenerateAi,
  onUndoAi,
  regeneratingItemId,
}: Props) {
  const [linkUrl, setLinkUrl] = useState("");
  const [linkNote, setLinkNote] = useState("");

  useEffect(() => {
    if (draft.type !== "link") return;
    const parsed = parseLinkContent(draft.content);
    setLinkUrl(parsed.url);
    setLinkNote(parsed.note);
    // Only re-sync when a *different* item opens, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.id]);

  if (!draft.id) {
    return (
      <Sheet open={open} onClose={onClose} title="Detay" desktopWidthClassName="lg:w-[460px]">
        {null}
      </Sheet>
    );
  }

  const id = draft.id;

  const updateLinkUrl = (value: string) => {
    setLinkUrl(value);
    onChangeDraft({ ...draft, content: joinLinkContent(value, linkNote) });
  };

  const updateLinkNote = (value: string) => {
    setLinkNote(value);
    onChangeDraft({ ...draft, content: joinLinkContent(linkUrl, value) });
  };

  const aiStatus = (item as any)?.ai_status as string | undefined;
  const aiSummaryRaw = (item as any)?.ai_summary as string | null | undefined;
  const aiSummary = (() => {
    const s = (aiSummaryRaw ?? "").trim();
    if (!s || isDebugAiSummary(s)) return null;
    return s;
  })();
  const cat = categoryMeta((item as any)?.ai_category);
  const workStatus = ((item as any)?.work_status ?? "later") as WorkStatus;
  const hasActiveSnooze = item ? isActivelySnoozed(item as any) : false;
  const snoozeLabel = item ? snoozeLeftLabel((item as any)?.snoozed_until) : null;
  const isRegenerating = regeneratingItemId === id;
  const showUndo = item ? canUndoAi(item) : false;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={draft.type === "link" ? "Link detayı" : "Not detayı"}
      desktopWidthClassName="lg:w-[460px]"
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="danger"
            onClick={() => onDelete(id)}
            className="min-h-[44px] sm:min-h-0"
          >
            Sil
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} className="min-h-[44px] sm:min-h-0">
              Kapat
            </Button>
            <Button onClick={onSave} className="min-h-[44px] sm:min-h-0">
              Kaydet
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="mb-1 text-xs text-neutral-400">Başlık</div>
          <Input
            value={draft.title}
            onChange={(e) => onChangeDraft({ ...draft, title: e.target.value })}
          />
        </div>

        {draft.type === "link" ? (
          <>
            <div>
              <div className="mb-1 text-xs text-neutral-400">URL</div>
              <Input
                value={linkUrl}
                onChange={(e) => updateLinkUrl(e.target.value)}
                inputMode="url"
                className="break-all"
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-neutral-400">Açıklama</div>
              <Textarea
                className="max-h-[24vh] overflow-y-auto sm:max-h-none"
                value={linkNote}
                onChange={(e) => updateLinkNote(e.target.value)}
                placeholder="Bu link neyle ilgili?"
              />
            </div>
          </>
        ) : (
          <div>
            <div className="mb-1 text-xs text-neutral-400">Not</div>
            <Textarea
              className="max-h-[34vh] overflow-y-auto sm:max-h-none"
              value={draft.content}
              onChange={(e) => onChangeDraft({ ...draft, content: e.target.value })}
            />
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/38">
              AI
            </div>
            <div className="flex items-center gap-2">
              {aiStatus === "processing" || isRegenerating ? (
                <span className="theme-chip rounded-md px-2 py-0.5 text-[10px] text-white/62">
                  Çalışıyor…
                </span>
              ) : aiStatus === "failed" ? (
                <span className="rounded-full border border-red-900 bg-neutral-950 px-2 py-0.5 text-[10px] text-red-300">
                  Hata
                </span>
              ) : aiStatus === "done" ? (
                <span className="theme-chip rounded-md px-2 py-0.5 text-[10px] text-white/62">
                  Hazır
                </span>
              ) : null}
            </div>
          </div>

          {cat && aiStatus === "done" ? (
            <div className="mt-2 inline-flex items-center gap-1 rounded-md theme-accent-chip px-2 py-1 text-xs">
              {cat.icon} {cat.label}
            </div>
          ) : null}

          <div className="mt-2 text-sm leading-6 text-white/68">
            {aiSummary ?? (
              <span className="text-white/38">
                Bu kayıt için henüz AI özeti yok.
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onRegenerateAi(id)}
              disabled={isRegenerating}
              className="rounded-lg border border-sky-900/40 bg-sky-950/30 px-3 py-1.5 text-xs font-semibold text-sky-200 transition hover:bg-sky-900/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {aiStatus === "done" || aiStatus === "failed"
                ? "Yeniden üret"
                : "AI çalıştır"}
            </button>
            {showUndo ? (
              <button
                type="button"
                onClick={() => onUndoAi(id)}
                className="rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-900/30"
              >
                Geri al
              </button>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/38">
              İşleme durumu
            </div>
            <select
              value={workStatus}
              onChange={(e) => onSetWorkStatus(id, e.target.value as WorkStatus)}
              className="h-9 rounded-lg border border-white/10 bg-[#07090d] px-3 text-xs font-semibold text-white/82 outline-none focus:border-cyan-200/50"
            >
              {Object.entries(WORK_STATUS_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSetWorkStatus(id, "today")}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/78 transition hover:bg-white/[0.08]"
            >
              Bugüne al
            </button>
            <button
              type="button"
              onClick={() => onSetWorkStatus(id, "done")}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/78 transition hover:bg-white/[0.08]"
            >
              Bitti işaretle
            </button>
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => onSetSnooze(id, days)}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/78 transition hover:bg-white/[0.08]"
              >
                {days}g ertele
              </button>
            ))}
            {hasActiveSnooze ? (
              <button
                type="button"
                onClick={() => onSetSnooze(id, null)}
                className="rounded-lg border border-amber-300/18 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/15"
              >
                Ertelemeyi kaldır
              </button>
            ) : null}
          </div>

          {snoozeLabel ? (
            <div className="mt-2 text-[11px] text-amber-200/80">{snoozeLabel}</div>
          ) : null}
        </div>

        <div>
          <div className="mb-1 text-xs text-neutral-400">Grup</div>
          <select
            value={draft.group_id ?? ""}
            onChange={(e) =>
              onChangeDraft({ ...draft, group_id: e.target.value ? e.target.value : null })
            }
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
          >
            <option value="">Inbox (grupsuz)</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1 text-xs text-neutral-400">Etiketler</div>
          <TagInput
            value={draft.tags}
            onChange={(tags) => onChangeDraft({ ...draft, tags })}
          />
        </div>
      </div>
    </Sheet>
  );
}
