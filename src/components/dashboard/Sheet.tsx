"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

// Coordinates body scroll locking across every simultaneously-open Sheet
// instance so the lock is only released once the last one closes.
let lockCount = 0;
let previousOverflow = "";

function lockBodyScroll() {
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow;
  }
}

function getFocusable(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null || el === document.activeElement);
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Tailwind width classes applied to the desktop (lg:) right-side panel. */
  desktopWidthClassName?: string;
  closeOnBackdrop?: boolean;
};

const TRANSITION_MS = 200;

export default function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  desktopWidthClassName = "lg:w-[440px]",
  closeOnBackdrop = true,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const reduceMotion = usePrefersReducedMotion();

  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }

    setShown(false);
    const t = window.setTimeout(
      () => setMounted(false),
      reduceMotion ? 0 : TRANSITION_MS,
    );
    return () => window.clearTimeout(t);
  }, [open, reduceMotion]);

  useEffect(() => {
    if (!open) return;

    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    lockBodyScroll();

    const raf = requestAnimationFrame(() => {
      const focusable = panelRef.current ? getFocusable(panelRef.current) : [];
      (focusable[0] ?? panelRef.current)?.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      unlockBodyScroll();
      lastFocusedRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === "Tab" && panelRef.current) {
        const focusable = getFocusable(panelRef.current);
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  if (!mounted) return null;

  const transitionClass = reduceMotion ? "" : `transition-all duration-200 ease-out`;

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm ${transitionClass} ${
          shown ? "opacity-100" : "opacity-0"
        }`}
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`safe-x theme-shell-strong absolute inset-x-0 bottom-0 flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-t-2xl bg-[#07090d]/97 shadow-[0_-20px_80px_rgba(0,0,0,0.5)] outline-none lg:inset-y-0 lg:bottom-auto lg:left-auto lg:right-0 lg:max-h-none lg:rounded-none lg:rounded-l-2xl lg:border-l lg:border-white/10 ${transitionClass} ${
          shown
            ? "translate-y-0 lg:translate-x-0"
            : "translate-y-full lg:translate-x-full lg:translate-y-0"
        } ${desktopWidthClassName}`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 pt-[calc(0.75rem+var(--safe-top))] pb-3 lg:pt-4">
          <h2 id={titleId} className="text-sm font-semibold text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-lg px-2 py-1 text-white/42 transition hover:bg-white/[0.06] hover:text-white/78"
          >
            ×
          </button>
        </div>

        <div
          className={`min-h-0 flex-1 overflow-y-auto px-4 py-4 ${
            footer ? "" : "pb-[calc(1rem+var(--safe-bottom))]"
          }`}
        >
          {children}
        </div>

        {footer ? (
          <div className="border-t border-white/10 bg-[#07090d]/95 px-4 py-3 pb-[calc(0.75rem+var(--safe-bottom))] backdrop-blur-xl">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
