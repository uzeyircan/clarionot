"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { NATIVE_BACK_EVENT } from "@/lib/nativeBack";

type PlanRow = {
  plan: "free" | "pro" | null;
  status: string | null;
  current_period_end: string | null;
  grace_until: string | null;
};

export default function Header({ center }: { center?: ReactNode } = {}) {
  const router = useRouter();

  const [loggedIn, setLoggedIn] = useState(false);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [checkingPlan, setCheckingPlan] = useState(true);
  const [hasPaymentIssue, setHasPaymentIssue] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);

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
    mountedRef.current = true;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        const uid = session?.user?.id ?? null;
        const mail = session?.user?.email ?? "";

        if (!mountedRef.current) return;
        setLoggedIn(!!session);
        setEmail(mail);

        if (uid) {
          void fetchPlan(uid);
        } else {
          setPlan("free");
          setHasPaymentIssue(false);
          setCheckingPlan(false);
        }
      } finally {
        if (mountedRef.current) setSessionResolved(true);
      }
    };

    void init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const uid = session?.user?.id ?? null;
        const mail = session?.user?.email ?? "";

        if (!mountedRef.current) return;
        setLoggedIn(!!session);
        setEmail(mail);

        if (uid) {
          void fetchPlan(uid);
        } else {
          setPlan("free");
          setHasPaymentIssue(false);
          setCheckingPlan(false);
        }

        setSessionResolved(true);
      },
    );

    return () => {
      mountedRef.current = false;
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

  // ✅ Android donanım geri tuşu: menü açıkken yalnızca menüyü kapatsın,
  // sayfa aynı basışta geri gitmesin veya uygulama minimize olmasın (bkz.
  // NativeBackController). Listener sadece menü açıkken bağlı kalır, bu
  // yüzden aynı anda birden fazla eklenmesi veya menü kapalıyken olayı
  // yutması söz konusu olmaz. Bir dashboard modalı bu event'i bizden önce
  // claim ettiyse (defaultPrevented) dokunmayız — görsel olarak üstte olan
  // modal varsa aynı basışta ikisini birden kapatmayız.
  useEffect(() => {
    if (!menuOpen) return;

    const onNativeBack = (event: Event) => {
      if (event.defaultPrevented) return;
      setMenuOpen(false);
      event.preventDefault();
    };

    window.addEventListener(NATIVE_BACK_EVENT, onNativeBack);
    return () => window.removeEventListener(NATIVE_BACK_EVENT, onNativeBack);
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

      {center ? <div className="min-w-0 flex-1 px-3">{center}</div> : null}

      <div className="flex items-center gap-2">
        {!sessionResolved ? (
          <div
            className="flex items-center gap-2"
            aria-busy="true"
            aria-label="Oturum bilgisi yükleniyor"
          >
            <div className="hidden h-9 w-20 animate-pulse rounded-lg bg-white/[0.04] sm:block" />
            <div className="h-9 w-24 animate-pulse rounded-lg bg-white/[0.04]" />
            <div className="h-9 w-9 animate-pulse rounded-lg bg-white/[0.04]" />
          </div>
        ) : !loggedIn ? (
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

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-transparent px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-neutral-900 hover:text-white active:scale-[0.99]"
            >
              Giriş yap
            </Link>
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
                      type="button"
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
