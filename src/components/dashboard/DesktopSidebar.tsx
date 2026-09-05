"use client";

import type { ReactNode } from "react";
import type { Group } from "@/lib/items";

type DropHandlers = {
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
};

type Props = {
  primaryNav: "home" | "today" | "forgotten" | "groups";
  forgottenCount: number;
  onNavHome: () => void;
  onNavToday: () => void;
  onNavForgotten: () => void;
  groups: Group[];
  activeGroupId: string;
  onSelectGroup: (id: string) => void;
  groupCounts: Record<string, number>;
  groupsExpanded: boolean;
  onToggleGroupsExpanded: () => void;
  onOpenCreateGroup: () => void;
  onRenameGroup: (g: Group) => void;
  onDeleteGroup: (id: string) => void;
  inboxDrop: DropHandlers;
  makeGroupDrop: (groupId: string) => DropHandlers;
  isDropTarget: (target: "inbox" | { groupId: string }) => boolean;
  totalCount: number;
  noteCount: number;
  linkCount: number;
  extension: ReactNode;
};

function NavButton({
  active,
  onClick,
  label,
  icon,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "accent-soft accent-border text-white"
          : "border-transparent text-white/70 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <span className="flex items-center gap-2.5">
        <span aria-hidden="true">{icon}</span>
        {label}
      </span>
      {badge ? (
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-cyan-100">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export default function DesktopSidebar({
  primaryNav,
  forgottenCount,
  onNavHome,
  onNavToday,
  onNavForgotten,
  groups,
  activeGroupId,
  onSelectGroup,
  groupCounts,
  groupsExpanded,
  onToggleGroupsExpanded,
  onOpenCreateGroup,
  onRenameGroup,
  onDeleteGroup,
  inboxDrop,
  makeGroupDrop,
  isDropTarget,
  totalCount,
  noteCount,
  linkCount,
  extension,
}: Props) {
  return (
    <aside className="sticky top-[calc(5rem+var(--safe-top))] hidden max-h-[calc(100dvh-6rem-var(--safe-top))] w-56 shrink-0 self-start flex-col lg:flex">
      <nav className="flex flex-col gap-1" aria-label="Ana gezinme">
        <NavButton active={primaryNav === "home"} onClick={onNavHome} label="Ana sayfa" icon="▣" />
        <NavButton active={primaryNav === "today"} onClick={onNavToday} label="Bugün" icon="☀" />
        <NavButton
          active={primaryNav === "forgotten"}
          onClick={onNavForgotten}
          label="Unutulanlar"
          icon="↺"
          badge={forgottenCount}
        />
      </nav>

      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={onToggleGroupsExpanded}
            aria-expanded={groupsExpanded}
            aria-controls="sidebar-groups-list"
            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/42 hover:text-white/70"
          >
            <span aria-hidden="true">{groupsExpanded ? "▾" : "▸"}</span>
            Gruplar
          </button>
          <button
            type="button"
            onClick={onOpenCreateGroup}
            aria-label="Yeni grup oluştur"
            className="grid h-6 w-6 place-items-center rounded-md text-white/50 hover:bg-white/[0.06] hover:text-white"
          >
            +
          </button>
        </div>

        {groupsExpanded ? (
          <div id="sidebar-groups-list" className="mt-2 flex flex-col gap-0.5">
            <div
              {...inboxDrop}
              className={`rounded-lg ${isDropTarget("inbox") ? "outline outline-2 outline-cyan-300/50" : ""}`}
            >
              <NavButton
                active={primaryNav === "groups" && activeGroupId === "inbox"}
                onClick={() => onSelectGroup("inbox")}
                label="Inbox"
                icon="□"
                badge={groupCounts["inbox"] ?? 0}
              />
            </div>

            {groups.map((g) => {
              const drop = makeGroupDrop(g.id);
              const isOver = isDropTarget({ groupId: g.id });
              const isActive = primaryNav === "groups" && activeGroupId === g.id;

              return (
                <div
                  key={g.id}
                  {...drop}
                  className={`group/row flex items-center gap-1 rounded-lg border pr-1 ${
                    isOver ? "outline outline-2 outline-cyan-300/50" : ""
                  } ${
                    isActive
                      ? "accent-soft accent-border"
                      : "border-transparent hover:bg-white/[0.06]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectGroup(g.id)}
                    className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${
                      isActive ? "text-white" : "text-white/70"
                    }`}
                  >
                    <span className="min-w-0 truncate">{g.title}</span>
                    <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-cyan-100">
                      {groupCounts[g.id] ?? 0}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRenameGroup(g)}
                    aria-label={`${g.title} grubunu yeniden adlandır`}
                    className="hidden h-7 w-7 shrink-0 place-items-center rounded-md text-xs text-white/45 hover:bg-white/[0.08] group-hover/row:grid"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteGroup(g.id)}
                    aria-label={`${g.title} grubunu sil`}
                    className="hidden h-7 w-7 shrink-0 place-items-center rounded-md text-xs text-white/45 hover:bg-red-500/20 hover:text-red-300 group-hover/row:grid"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="mt-4 px-1 text-[11px] text-white/38">
        Toplam {totalCount} · Not {noteCount} · Link {linkCount}
      </div>

      <div className="mt-auto border-t border-white/10 pt-4">{extension}</div>
    </aside>
  );
}
