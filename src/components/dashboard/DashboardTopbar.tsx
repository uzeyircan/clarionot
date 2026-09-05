"use client";

import type { RefObject } from "react";
import Header from "@/components/Header";

type Props = {
  q: string;
  onChangeQ: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement>;
  mobileSearchOpen: boolean;
  onToggleMobileSearch: () => void;
  onOpenCreate: () => void;
};

export default function DashboardTopbar({
  q,
  onChangeQ,
  searchInputRef,
  mobileSearchOpen,
  onToggleMobileSearch,
  onOpenCreate,
}: Props) {
  const hasHiddenSearch = !mobileSearchOpen && q.trim().length > 0;
  return (
    <div className="theme-topbar fixed inset-x-0 top-0 z-50 px-4 pb-3 pt-[calc(0.75rem+var(--safe-top))] safe-x sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Header
          center={
            <div className="flex items-center justify-end gap-2 lg:justify-start">
              <div className="relative hidden max-w-xl flex-1 lg:block">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/34">
                  🔍
                </span>
                <input
                  ref={searchInputRef}
                  value={q}
                  onChange={(e) => onChangeQ(e.target.value)}
                  placeholder="Ara... (Ctrl/⌘ K)"
                  aria-label="Kayıtlarda ara"
                  className="h-10 w-full rounded-lg border border-white/10 bg-[#07090d] pl-9 pr-3 text-sm text-white/82 placeholder:text-white/34 outline-none transition focus:border-cyan-200/50"
                />
              </div>

              <button
                type="button"
                onClick={onToggleMobileSearch}
                aria-label={
                  hasHiddenSearch ? `Ara (aktif: "${q.trim()}")` : "Ara"
                }
                aria-expanded={mobileSearchOpen}
                className={`grid h-10 w-10 place-items-center rounded-lg border text-white/70 transition lg:hidden ${
                  hasHiddenSearch
                    ? "accent-border accent-soft"
                    : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                }`}
              >
                🔍
              </button>

              <button
                type="button"
                onClick={onOpenCreate}
                className="accent-gradient hidden h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition hover:opacity-90 lg:inline-flex"
              >
                + Yeni kayıt
              </button>
            </div>
          }
        />

        {mobileSearchOpen ? (
          <div className="relative mt-3 lg:hidden">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/34">
              🔍
            </span>
            <input
              autoFocus
              value={q}
              onChange={(e) => onChangeQ(e.target.value)}
              placeholder="Ara..."
              aria-label="Kayıtlarda ara"
              className="h-11 w-full rounded-lg border border-white/10 bg-[#07090d] pl-9 pr-3 text-base text-white/82 placeholder:text-white/34 outline-none transition focus:border-cyan-200/50"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
