"use client";

type Props = {
  primaryNav: "home" | "today" | "forgotten" | "groups";
  forgottenCount: number;
  onNavHome: () => void;
  onNavToday: () => void;
  onNavForgotten: () => void;
  onOpenGroups: () => void;
};

function NavItem({
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
      className={`relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-4 py-1 text-[10px] font-semibold uppercase tracking-widest transition ${
        active ? "text-cyan-100" : "text-white/45 hover:bg-white/[0.06]"
      }`}
    >
      <span className="relative text-lg" aria-hidden="true">
        {icon}
        {badge ? (
          <span className="absolute -right-2 -top-1 rounded-full bg-cyan-300 px-1 text-[9px] font-bold text-[#030406]">
            {badge}
          </span>
        ) : null}
      </span>
      {label}
    </button>
  );
}

export default function MobileBottomNav({
  primaryNav,
  forgottenCount,
  onNavHome,
  onNavToday,
  onNavForgotten,
  onOpenGroups,
}: Props) {
  return (
    <nav
      className="mobile-bottom-nav fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-white/10 bg-[#030406]/82 px-2 safe-x shadow-2xl backdrop-blur-2xl lg:hidden"
      aria-label="Alt gezinme"
    >
      <NavItem active={primaryNav === "home"} onClick={onNavHome} label="Ana sayfa" icon="▣" />
      <NavItem active={primaryNav === "today"} onClick={onNavToday} label="Bugün" icon="☀" />
      <NavItem
        active={primaryNav === "forgotten"}
        onClick={onNavForgotten}
        label="Unutulan"
        icon="↺"
        badge={forgottenCount}
      />
      <NavItem active={primaryNav === "groups"} onClick={onOpenGroups} label="Gruplar" icon="□" />
    </nav>
  );
}
