"use client";

import React, { useEffect } from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export default function Modal({ open, title, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-2 safe-x sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="theme-shell-strong relative mb-[var(--safe-bottom)] max-h-[calc(100dvh-1rem-var(--safe-top)-var(--safe-bottom))] w-full max-w-lg overflow-hidden rounded-xl bg-[#07090d]/95 shadow-[0_40px_120px_rgba(0,0,0,0.48)] sm:max-h-[calc(100dvh-1.5rem-var(--safe-top)-var(--safe-bottom))]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#07090d]/95 px-4 py-3 backdrop-blur-xl">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            className="rounded-lg px-2 py-1 text-white/42 hover:bg-white/[0.06] hover:text-white/78"
            onClick={onClose}
            aria-label="Kapat"
          >
            ×
          </button>
        </div>
        <div className="max-h-[inherit] overflow-y-auto p-4 pt-3">
          {children}
        </div>
      </div>
    </div>
  );
}
