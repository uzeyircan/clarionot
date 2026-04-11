"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/Button";
import { useRouter } from "next/navigation";

type PlanRow = {
  plan: "free" | "pro" | null;
  status: string | null;
  current_period_end: string | null;
  grace_until: string | null;
};

export default function Header() {
  const router = useRouter();

  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState<string>("");

  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [checkingPlan, setCheckingPlan] = useState(true);
  const [hasPaymentIssue, setHasPaymentIssue] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const initials = useMemo(() => {
    const e = (email || "").trim();
    if (!e) return "U";
    return e[0].toUpperCase();
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

      if (uid) fetchPlan(uid);
      else {
        setPlan("free");
        setHasPaymentIssue(false);
        setCheckingPlan(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const uid = session?.user?.id ?? null;
        const mail = session?.user?.email ?? "";

        setLoggedIn(!!session);
        setEmail(mail);

        if (uid) fetchPlan(uid);
        else {
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

    const onDown = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
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
        className="flex items-center gap-2 text-sm font-black tracking-tight text-emerald-300 sm:text-xl"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full border border-emerald-300/30 bg-emerald-300/10 text-sm">
          c
        </span>
        <span className="hidden sm:inline">clarionot</span>
      </Link>

      <div className="flex items-center gap-2">
        {!loggedIn ? (
          <>
            <Link
              href="/pro"
              className="inline-flex items-center justify-center rounded-full border border-[#3d4a3e]/50 bg-[#201f1f] px-4 py-2 text-xs font-semibold text-[#e5e2e1] transition hover:bg-[#2a2a2a]"
            >
              Planlar
            </Link>

            <Button variant="ghost">
              <Link
                href="/login"
                className="text-sm text-[#bccabb] hover:text-white"
              >
                Giriş Yap
              </Link>
            </Button>
          </>
        ) : (
          <>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                plan === "pro"
                  ? "bg-emerald-300/10 text-emerald-300 border-emerald-300/30"
                  : "bg-zinc-500/10 text-zinc-300 border-zinc-500/30"
              }`}
              title={checkingPlan ? "Plan kontrol ediliyor" : undefined}
            >
              {checkingPlan ? "..." : plan === "pro" ? "PRO" : "FREE"}
            </span>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex items-center gap-3 rounded-full border border-[#3d4a3e]/50 bg-[#131313]/70 px-3 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-[#1c1b1b]"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2a2a2a] text-[13px] font-bold text-emerald-200">
                  {initials}
                </span>

                {hasPaymentIssue ? (
                  <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold text-red-300 border border-red-500/25">
                    ⚠️
                  </span>
                ) : null}
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 mt-3 w-64 overflow-hidden rounded-xl border border-[#3d4a3e]/40 bg-[#0e0e0e] shadow-2xl"
                >
                  {/* Email (disabled) */}
                  <div className="border-b border-[#3d4a3e]/25 px-4 py-3">
                    <div className="text-[11px] text-zinc-500">Hesap</div>
                    <div className="mt-0.5 truncate text-xs text-zinc-200">
                      {email || "—"}
                    </div>
                  </div>

                  <div className="p-2">
                    <Link
                      role="menuitem"
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
                    >
                      Dashboard
                    </Link>

                    <Link
                      role="menuitem"
                      href="/pro"
                      onClick={() => setMenuOpen(false)}
                      className={`mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-neutral-900 ${
                        hasPaymentIssue ? "text-amber-200" : "text-zinc-200"
                      }`}
                    >
                      {hasPaymentIssue
                        ? "⚠️ Payment issue"
                        : plan === "pro"
                          ? "Billing"
                          : "Upgrade to Pro"}
                    </Link>

                    <div className="my-2 border-t border-[#3d4a3e]/25" />

                    <button
                      role="menuitem"
                      onClick={logout}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-red-300 hover:bg-red-950/30"
                    >
                      Çıkış Yap
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
