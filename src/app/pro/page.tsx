"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PlanRow = {
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
};

const FEATURES = [
  { name: "Right-click save (Extension)", free: false, pro: true },
  { name: "Auto title from links", free: true, pro: true },
  { name: "Tags & search", free: true, pro: true },
  { name: "Unlimited saves", free: false, pro: true },
  { name: "Priority updates", free: false, pro: true },
];

export default function ProPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [needLogin, setNeedLogin] = useState(false);

  const [plan, setPlan] = useState<PlanRow | null>(null);
  const [err, setErr] = useState<string>("");

  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const isPro = useMemo(() => {
    return plan?.plan === "pro" && plan?.status === "active";
  }, [plan]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const { data } = await supabase.auth.getSession();
        const session = data.session;

        if (!session?.user?.id) {
          setNeedLogin(true);
          return;
        }

        // user_plan oku (RLS: user kendi satırını görebiliyor olmalı)
        const { data: row, error } = await supabase
          .from("user_plan")
          .select("plan,status,current_period_end")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) throw error;

        setPlan((row ?? null) as any);
      } catch (e: any) {
        setErr(e?.message ?? "Plan bilgisi alınamadı.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const startCheckout = async () => {
    try {
      setCheckoutLoading(true);
      setErr("");

      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session?.access_token) {
        setNeedLogin(true);
        return;
      }

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      const url = json?.url;
      if (!url) throw new Error("Checkout URL alınamadı.");

      window.location.href = url;
    } catch (e: any) {
      setErr(e?.message ?? "Checkout başlatılamadı.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-300">
        Yükleniyor…
      </div>
    );
  }

  if (needLogin) {
    const redirect = encodeURIComponent("/pro");
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
          <div className="text-xl font-semibold text-neutral-100">
            Giriş gerekli
          </div>
          <div className="mt-2 text-sm text-neutral-400">
            Pro planı görmek ve yükseltmek için giriş yapmalısın.
          </div>
          <button
            onClick={() => router.push(`/login?redirect=${redirect}`)}
            className="mt-4 w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100"
          >
            Giriş Yap
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="text-center">
          <div className="text-4xl font-semibold text-neutral-100">
            Discover the difference
          </div>
          <div className="mt-3 text-neutral-400">
            Upgrade to Pro to unlock the browser extension and save anything in
            one click. Cancel anytime.
          </div>
        </div>

        {/* Plan durum badge */}
        <div className="mt-8 flex justify-center">
          <div className="rounded-full border border-neutral-800 bg-neutral-950 px-4 py-2 text-xs text-neutral-300">
            Current plan:{" "}
            <span className={isPro ? "text-emerald-300" : "text-amber-300"}>
              {isPro ? "PRO" : "FREE"}
            </span>
            {plan?.current_period_end ? (
              <span className="text-neutral-500">
                {" "}
                • renews:{" "}
                {new Date(plan.current_period_end).toLocaleDateString()}
              </span>
            ) : null}
          </div>
        </div>

        {/* Compare table */}
        <div className="mt-10 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
          <div className="grid grid-cols-3 gap-4 text-sm text-neutral-200">
            <div className="font-semibold text-neutral-100">Benefits</div>
            <div className="text-center font-semibold text-neutral-300">
              Free
            </div>
            <div className="text-center font-semibold text-neutral-100">
              Pro
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {FEATURES.map((f) => (
              <div
                key={f.name}
                className="grid grid-cols-3 gap-4 items-center border-t border-neutral-900 pt-3"
              >
                <div className="text-neutral-200">{f.name}</div>
                <div className="text-center text-neutral-400">
                  {f.free ? "✅" : "—"}
                </div>
                <div className="text-center text-neutral-100">
                  {f.pro ? "✅" : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Free */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <div className="text-sm font-semibold text-neutral-300">Free</div>
            <div className="mt-2 text-3xl font-semibold text-neutral-100">
              $0
            </div>
            <div className="mt-2 text-sm text-neutral-400">
              Save notes & links manually from dashboard.
            </div>

            <ul className="mt-4 space-y-2 text-sm text-neutral-300">
              <li>• Notes & links</li>
              <li>• Tags & search</li>
              <li>• Basic limits apply</li>
            </ul>

            <button
              onClick={() => router.push("/dashboard")}
              className="mt-6 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-100 hover:bg-neutral-800"
            >
              Go to Dashboard
            </button>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-neutral-100">Pro</div>
              <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">
                Recommended
              </div>
            </div>

            <div className="mt-2 text-3xl font-semibold text-neutral-100">
              {/* fiyatı sonra bağlayacağız */}
              $4.99
              <span className="text-base font-normal text-neutral-400">
                {" "}
                / month
              </span>
            </div>

            <div className="mt-2 text-sm text-neutral-400">
              Right-click to save selections and links. Auto titles. Unlimited
              saves.
            </div>

            <ul className="mt-4 space-y-2 text-sm text-neutral-200">
              <li>• Browser extension (right-click save)</li>
              <li>• Unlimited saves</li>
              <li>• Priority improvements</li>
            </ul>

            {isPro ? (
              <button
                onClick={() => router.push("/dashboard")}
                className="mt-6 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-100 hover:bg-neutral-800"
              >
                You are Pro ✅
              </button>
            ) : (
              <button
                onClick={startCheckout}
                disabled={checkoutLoading}
                className="mt-6 w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 disabled:opacity-60"
              >
                {checkoutLoading ? "Redirecting…" : "Upgrade to Pro"}
              </button>
            )}
          </div>
        </div>

        {err ? (
          <div className="mt-6 rounded-xl border border-red-900/40 bg-red-950/40 p-4 text-sm text-red-200">
            {err}
          </div>
        ) : null}
      </div>
    </main>
  );
}
