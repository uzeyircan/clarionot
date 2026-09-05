"use client";

import Sheet from "@/components/dashboard/Sheet";
import type { Group } from "@/lib/items";

type Props = {
  open: boolean;
  onClose: () => void;
  groups: Group[];
  activeGroupId: string;
  groupCounts: Record<string, number>;
  onSelectGroup: (id: string) => void;
  onOpenCreateGroup: () => void;
  onRenameGroup: (g: Group) => void;
  onDeleteGroup: (id: string) => void;
};

export default function MobileGroupsSheet({
  open,
  onClose,
  groups,
  activeGroupId,
  groupCounts,
  onSelectGroup,
  onOpenCreateGroup,
  onRenameGroup,
  onDeleteGroup,
}: Props) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Gruplar"
      footer={
        <button
          type="button"
          onClick={onOpenCreateGroup}
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-white/[0.08]"
        >
          + Yeni grup
        </button>
      }
    >
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => {
            onSelectGroup("inbox");
            onClose();
          }}
          className={`flex items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-semibold ${
            activeGroupId === "inbox" ? "bg-white text-[#030406]" : "text-white/78 hover:bg-white/[0.06]"
          }`}
        >
          <span>Inbox</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              activeGroupId === "inbox" ? "bg-black/10 text-[#030406]/70" : "bg-white/10 text-cyan-100"
            }`}
          >
            {groupCounts["inbox"] ?? 0}
          </span>
        </button>

        {groups.map((g) => {
          const isActive = activeGroupId === g.id;
          return (
            <div
              key={g.id}
              className={`flex items-center gap-1 rounded-lg pr-1 ${
                isActive ? "bg-white" : "hover:bg-white/[0.06]"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  onSelectGroup(g.id);
                  onClose();
                }}
                className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-3 py-3 text-left text-sm font-semibold ${
                  isActive ? "text-[#030406]" : "text-white/78"
                }`}
              >
                <span className="min-w-0 truncate">{g.title}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isActive ? "bg-black/10 text-[#030406]/70" : "bg-white/10 text-cyan-100"
                  }`}
                >
                  {groupCounts[g.id] ?? 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onRenameGroup(g)}
                aria-label={`${g.title} grubunu yeniden adlandır`}
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-md text-sm ${
                  isActive ? "text-[#030406]/60" : "text-white/45 hover:bg-white/[0.08]"
                }`}
              >
                ✎
              </button>
              <button
                type="button"
                onClick={() => onDeleteGroup(g.id)}
                aria-label={`${g.title} grubunu sil`}
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-md text-sm ${
                  isActive ? "text-[#030406]/60" : "text-white/45 hover:bg-red-500/20 hover:text-red-300"
                }`}
              >
                ✕
              </button>
            </div>
          );
        })}

        {groups.length === 0 ? (
          <p className="px-3 py-2 text-sm text-white/46">Henüz grup yok.</p>
        ) : null}
      </div>
    </Sheet>
  );
}
