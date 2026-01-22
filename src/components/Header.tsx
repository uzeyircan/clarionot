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
        className="text-sm font-semibold tracking-wide flex items-center gap-2"
      >
        ClarioNot
      </Link>

      <div className="flex items-center gap-2">
        {!loggedIn ? (
          <>
            <Link
              href="/pro"
              className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-100 hover:bg-neutral-800 transition"
            >
              Planlar
            </Link>

            <Button variant="ghost">
              <Link
                href="/login"
                className="text-sm text-neutral-300 hover:text-white"
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
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-neutral-500/15 text-neutral-400 border-neutral-500/30"
              }`}
              title={checkingPlan ? "Plan kontrol ediliyor" : undefined}
            >
              {checkingPlan ? "..." : plan === "pro" ? "PRO" : "FREE"}
            </span>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex items-center gap-3 rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-neutral-100 hover:bg-neutral-900 transition"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-[13px] font-bold text-neutral-100">
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
                  className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-xl"
                >
                  {/* Email (disabled) */}
                  <div className="px-3 py-2 border-b border-neutral-900">
                    <div className="text-[11px] text-neutral-500">Hesap</div>
                    <div className="mt-0.5 text-xs text-neutral-200 truncate">
                      {email || "—"}
                    </div>
                  </div>

                  <div className="p-2">
                    <Link
                      role="menuitem"
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-900"
                    >
                      Dashboard
                    </Link>

                    <Link
                      role="menuitem"
                      href="/pro"
                      onClick={() => setMenuOpen(false)}
                      className={`mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-neutral-900 ${
                        hasPaymentIssue ? "text-amber-200" : "text-neutral-200"
                      }`}
                    >
                      {hasPaymentIssue
                        ? "⚠️ Payment issue"
                        : plan === "pro"
                          ? "Billing"
                          : "Upgrade to Pro"}
                    </Link>

                    <div className="my-2 border-t border-neutral-900" />

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
