"use client";

import Modal from "@/components/Modal";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Textarea from "@/components/Textarea";
import TagInput from "@/components/TagInput";
import type { Group, ItemDraft } from "@/lib/items";
import type { ItemType } from "@/lib/types";

type Props = {
  open: boolean;
  draft: ItemDraft;
  onChange: (draft: ItemDraft) => void;
  groups: Group[];
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
};

export default function CreateItemModal({
  open,
  draft,
  onChange,
  groups,
  saving,
  onClose,
  onSave,
}: Props) {
  const setType = (type: ItemType) => {
    if (type === draft.type) return;
    onChange({ ...draft, type, content: "", note: "" });
  };

  return (
    <Modal open={open} title="Yeni kayıt" onClose={onClose}>
      <div className="space-y-3">
        <div
          role="radiogroup"
          aria-label="Kayıt türü"
          className="grid grid-cols-2 gap-2"
        >
          <button
            type="button"
            role="radio"
            aria-checked={draft.type === "note"}
            onClick={() => setType("note")}
            className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
              draft.type === "note"
                ? "border-cyan-200/40 bg-cyan-200/10 text-cyan-50"
                : "border-white/10 bg-white/[0.03] text-white/62 hover:bg-white/[0.06]"
            }`}
          >
            📝 Not
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={draft.type === "link"}
            onClick={() => setType("link")}
            className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
              draft.type === "link"
                ? "border-cyan-200/40 bg-cyan-200/10 text-cyan-50"
                : "border-white/10 bg-white/[0.03] text-white/62 hover:bg-white/[0.06]"
            }`}
          >
            🔗 Link
          </button>
        </div>

        <div>
          <div className="mb-1 text-xs text-neutral-400">Başlık</div>
          <Input
            className="!text-base sm:!text-sm"
            value={draft.title}
            onChange={(e) => onChange({ ...draft, title: e.target.value })}
            placeholder={
              draft.type === "link"
                ? "Örn: YouTube - React Hooks"
                : "Örn: Bugünkü notlar"
            }
          />
        </div>

        {draft.type === "link" ? (
          <>
            <div>
              <div className="mb-1 text-xs text-neutral-400">URL</div>
              <Input
                className="!text-base sm:!text-sm"
                value={draft.content}
                onChange={(e) => onChange({ ...draft, content: e.target.value })}
                placeholder="https://..."
                inputMode="url"
              />
              <div className="mt-1 text-xs text-neutral-500">
                (http/https yoksa otomatik eklenecek)
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs text-neutral-400">
                Açıklama (opsiyonel)
              </div>
              <Textarea
                className="min-h-[90px] max-h-[22vh] overflow-y-auto !text-base sm:max-h-none sm:!text-sm"
                value={draft.note ?? ""}
                onChange={(e) => onChange({ ...draft, note: e.target.value })}
                placeholder="Bu link neyle ilgili?"
              />
            </div>
          </>
        ) : (
          <div>
            <div className="mb-1 text-xs text-neutral-400">Not</div>
            <Textarea
              className="min-h-[180px] max-h-[32vh] overflow-y-auto !text-base sm:max-h-none sm:!text-sm"
              value={draft.content}
              onChange={(e) => onChange({ ...draft, content: e.target.value })}
              placeholder="Notunu yaz..."
            />
          </div>
        )}

        <div>
          <div className="mb-1 text-xs text-neutral-400">Grup (opsiyonel)</div>
          <select
            value={draft.group_id ?? ""}
            onChange={(e) =>
              onChange({ ...draft, group_id: e.target.value ? e.target.value : null })
            }
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-base text-neutral-100 sm:text-sm"
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
            onChange={(tags) => onChange({ ...draft, tags })}
          />
        </div>

        <div className="sticky bottom-0 -mx-4 -mb-4 mt-2 flex justify-end gap-2 border-t border-white/10 bg-[#07090d]/95 px-4 py-3 pb-[calc(0.75rem+var(--safe-bottom))] backdrop-blur-xl">
          <Button
            variant="ghost"
            onClick={onClose}
            className="min-h-[44px] sm:min-h-0"
          >
            İptal
          </Button>
          <Button onClick={onSave} disabled={saving} className="min-h-[44px] sm:min-h-0">
            {saving
              ? draft.type === "link"
                ? "Başlık alınıyor…"
                : "Kaydediliyor…"
              : "Kaydet"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
