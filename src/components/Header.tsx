"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/Button";

type PlanRow = {
  plan: "free" | "pro" | null;
  status: string | null;
  current_period_end: string | null;
  grace_until: string | null;
};

export default function Header() {
  const router = useRouter();

  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [checkingPlan, setCheckingPlan] = useState(true);
  const [hasPaymentIssue, setHasPaymentIssue] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const initials = useMemo(() => {
    const value = email.trim();
    return value ? value[0].toUpperCase() : "U";
  }, [email]);

  const fetchPlan = async (uid: string) => {
    setCheckingPlan(true);
    try {
      const { data, error } = await supabase
        .from("user_plan")
        .select("plan,status,current_period_end,grace_until")
        .eq("user_id", uid)
        .maybeSingle();

      if (error || !data) {
        setPlan("free");
        setHasPaymentIssue(false);
        return;
      }

      const row = data as unknown as PlanRow;
      const statusOk = row.status === "active" || row.status === "trialing";
      const stillValid =
        !!row.current_period_end &&
        new Date(row.current_period_end).getTime() > Date.now();
      const inGrace =
        !!row.grace_until && new Date(row.grace_until).getTime() > Date.now();

      const isPro = row.plan === "pro" && (statusOk || stillValid || inGrace);

      setPlan(isPro ? "pro" : "free");
      setHasPaymentIssue(row.status === "past_due" || row.status === "unpaid");
    } finally {
      setCheckingPlan(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const uid = session?.user?.id ?? null;
      const mail = session?.user?.email ?? "";

      setLoggedIn(!!session);
      setEmail(mail);

      if (uid) {
        void fetchPlan(uid);
      } else {
        setPlan("free");
        setHasPaymentIssue(false);
        setCheckingPlan(false);
      }
    };

    void init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const uid = session?.user?.id ?? null;
        const mail = session?.user?.email ?? "";

        setLoggedIn(!!session);
        setEmail(mail);

        if (uid) {
          void fetchPlan(uid);
        } else {
          setPlan("free");
          setHasPaymentIssue(false);
          setCheckingPlan(false);
        }
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onMouseDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const logout = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="flex items-center justify-between">
      <Link
        href="/"
        className="flex items-center gap-3 text-sm font-semibold tracking-[0.22em] text-white/85 sm:text-base"
      >
        <span className="theme-chip theme-accent-glow grid h-9 w-9 place-items-center rounded-lg text-sm font-black">
          c
        </span>
        <span className="hidden sm:inline">clarionot</span>
      </Link>

      <div className="flex items-center gap-2">
        {!loggedIn ? (
          <>
            <Link
              href="/support"
              className="hidden items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/64 transition hover:bg-white/[0.08] hover:text-white sm:inline-flex"
            >
              Destek
            </Link>

            <Link
              href="/pro"
              className="theme-button-secondary inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-semibold transition"
            >
              Planlar
            </Link>

            <Button variant="ghost">
              <Link
                href="/login"
                className="text-sm text-white/70 hover:text-white"
              >
                Giriş yap
              </Link>
            </Button>
          </>
        ) : (
          <>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                plan === "pro"
                  ? "accent-soft accent-text accent-border"
                  : "border-white/10 bg-white/[0.045] text-white/62"
              }`}
              title={checkingPlan ? "Plan kontrol ediliyor" : undefined}
            >
              {checkingPlan ? "..." : plan === "pro" ? "PRO" : "FREE"}
            </span>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                className="theme-shell inline-flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-white transition"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[13px] font-bold text-[#030406]">
                  {initials}
                </span>

                {hasPaymentIssue ? (
                  <span className="rounded-full border border-red-500/25 bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold text-red-300">
                    !
                  </span>
                ) : null}
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  className="theme-menu-panel absolute right-0 mt-3 w-64 overflow-hidden rounded-xl"
                >
                  <div className="border-b border-white/10 px-4 py-3">
                    <div className="text-[11px] text-white/38">Hesap</div>
                    <div className="mt-0.5 truncate text-xs text-white/78">
                      {email || "—"}
                    </div>
                  </div>

                  <div className="p-2">
                    <Link
                      role="menuitem"
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="theme-menu-item"
                    >
                      Çalışma alanı
                    </Link>

                    <Link
                      role="menuitem"
                      href="/pro"
                      onClick={() => setMenuOpen(false)}
                      className={`theme-menu-item mt-1 ${
                        hasPaymentIssue ? "text-amber-200" : "text-white/78"
                      }`}
                    >
                      {hasPaymentIssue
                        ? "Ödeme sorunu"
                        : plan === "pro"
                          ? "Faturalandırma"
                          : "Pro'ya geç"}
                    </Link>

                    <Link
                      role="menuitem"
                      href="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="theme-menu-item mt-1"
                    >
                      Ayarlar ve dışa aktar
                    </Link>

                    <Link
                      role="menuitem"
                      href="/support"
                      onClick={() => setMenuOpen(false)}
                      className="theme-menu-item mt-1"
                    >
                      Destek
                    </Link>

                    <Link
                      role="menuitem"
                      href="/privacy"
                      onClick={() => setMenuOpen(false)}
                      className="theme-menu-item theme-menu-item-soft mt-1"
                    >
                      Gizlilik
                    </Link>

                    <div className="theme-menu-divider my-2" />

                    <button
                      role="menuitem"
                      onClick={logout}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-red-300 transition hover:bg-red-950/30"
                    >
                      Çıkış yap
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
