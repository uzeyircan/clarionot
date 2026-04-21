"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProPrice } from "@/lib/useProPrice";
import Header from "@/components/Header";
import DnaBackdrop from "@/components/DnaBackdrop";

type PlanRow = {
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end?: boolean | null;
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
  const [portalLoading, setPortalLoading] = useState(false);

  const { price, loading: priceLoading, error: priceErr } = useProPrice();

  const isPro = useMemo(() => {
    const statusOk = plan?.status === "active" || plan?.status === "trialing";
    const stillValid =
      !!plan?.current_period_end &&
      new Date(plan.current_period_end).getTime() > Date.now();

    return plan?.plan === "pro" && (statusOk || stillValid);
  }, [plan]);

  const hasPaymentIssue = useMemo(() => {
    return plan?.status === "past_due" || plan?.status === "unpaid";
  }, [plan]);

  const planLabel = useMemo(() => {
    if (!isPro) return "FREE";
    if (plan?.cancel_at_period_end) return "PRO (cancels at period end)";
    return "PRO";
  }, [isPro, plan?.cancel_at_period_end]);

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

        const { data: row, error } = await supabase
          .from("user_plan")
          .select("plan,status,current_period_end,cancel_at_period_end")
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

  const openBillingPortal = async () => {
    try {
      setPortalLoading(true);
      setErr("");

      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session?.access_token) {
        setNeedLogin(true);
        return;
      }

      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          return_url: window.location.href,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      const url = json?.url;
      if (!url) throw new Error("Portal URL alınamadı.");

      window.location.href = url;
    } catch (e: any) {
      setErr(e?.message ?? "Billing portal açılamadı.");
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#131313] text-[#e5e2e1]">
        <DnaBackdrop className="fixed opacity-25" />
        <div className="relative z-10 rounded-xl border border-[#3d4a3e]/30 bg-[#201f1f]/70 px-5 py-4 text-sm text-[#bccabb] backdrop-blur-2xl">
          Yükleniyor…
        </div>
      </main>
    );
  }

  if (needLogin) {
    const redirect = encodeURIComponent("/pro");
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#131313] px-5 text-[#e5e2e1]">
        <DnaBackdrop className="fixed opacity-25" />
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(107,251,154,0.09),transparent_42%),linear-gradient(to_bottom,transparent,#131313_82%)]" />
        <div className="relative z-10 w-full max-w-lg rounded-xl border border-[#3d4a3e]/30 bg-[#201f1f]/72 p-6 shadow-[0_32px_110px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
          <div className="text-xl font-semibold text-[#f4f1ef]">
            Giriş gerekli
          </div>
          <div className="mt-2 text-sm text-[#bccabb]">
            Pro planı görmek ve yükseltmek için giriş yapmalısın.
          </div>
          <button
            onClick={() => router.push(`/login?redirect=${redirect}`)}
            className="mt-4 w-full rounded-lg bg-gradient-to-r from-emerald-300 to-teal-300 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:scale-[1.01]"
          >
            Giriş Yap
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#131313] pb-16 text-[#e5e2e1]">
      <DnaBackdrop className="fixed opacity-30" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(107,251,154,0.08),transparent_42%),linear-gradient(to_bottom,transparent,#131313_82%)]" />
      <div className="fixed inset-x-0 top-0 z-50 border-b border-[#3d4a3e]/20 bg-[#131313]/70 px-5 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Header />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-5 pt-24 sm:px-6 lg:pt-28">
        <section className="rounded-xl border border-[#3d4a3e]/30 bg-[#201f1f]/70 p-5 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">
            Pro
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">
            Sağ tıkla kaydet. Sonra gerçekten kullan.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#bccabb]">
            Eklenti, sınırsız kayıt ve AI destekli özetlerle ClarioNot’u pasif
            arşivden çalışma alanına taşır. İstediğin zaman iptal edebilirsin.
          </p>
        </section>

        {/* ✅ Sadece Pro sayfasında ödeme sorunu uyarısı (Header'a dokunmuyoruz) */}
        {isPro && hasPaymentIssue ? (
          <div className="mt-6 rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100 backdrop-blur-xl">
            <div className="font-semibold text-amber-100">
              Ödeme sorunu tespit edildi
            </div>
            <div className="mt-1 text-amber-200/90">
              Kartınızdan ödeme alınamadı. Sorunu çözmek için kartınızı
              güncelleyin.
            </div>
            <button
              onClick={openBillingPortal}
              disabled={portalLoading}
              className="mt-3 rounded-lg bg-amber-200 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-60"
            >
              {portalLoading ? "Opening…" : "Kartı Güncelle"}
            </button>
          </div>
        ) : null}

        {/* Plan durum badge */}
        <div className="mt-8 flex justify-center">
          <div className="rounded-lg border border-[#3d4a3e]/30 bg-[#1c1b1b]/70 px-4 py-2 text-xs text-[#bccabb] backdrop-blur-2xl">
            Current plan:{" "}
            <span className={isPro ? "text-emerald-300" : "text-amber-300"}>
              {planLabel}
            </span>
            {isPro && plan?.current_period_end ? (
              <span className="text-neutral-500">
                {" "}
                • renews:{" "}
                {new Date(plan.current_period_end).toLocaleDateString()}
              </span>
            ) : null}
          </div>
        </div>

        {/* Compare table */}
        <div className="mt-8 rounded-xl border border-[#3d4a3e]/30 bg-[#1c1b1b]/70 p-4 backdrop-blur-2xl sm:p-6">
          <div className="grid grid-cols-3 gap-4 text-sm text-[#bccabb]">
            <div className="font-semibold text-[#f4f1ef]">Özellik</div>
            <div className="text-center font-semibold text-[#bccabb]">
              Free
            </div>
            <div className="text-center font-semibold text-[#f4f1ef]">
              Pro
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {FEATURES.map((f) => (
              <div
                key={f.name}
                className="grid grid-cols-3 items-center gap-4 border-t border-[#3d4a3e]/20 pt-3"
              >
                <div className="text-[#e5e2e1]">{f.name}</div>
                <div className="text-center text-[#bccabb]">
                  {f.free ? "✅" : "—"}
                </div>
                <div className="text-center text-[#f4f1ef]">
                  {f.pro ? "✅" : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Free */}
          <div className="rounded-xl border border-[#3d4a3e]/30 bg-[#1c1b1b]/70 p-6 backdrop-blur-2xl">
            <div className="text-sm font-semibold text-[#bccabb]">Free</div>
            <div className="mt-2 text-3xl font-semibold text-[#f4f1ef]">
              ₺0
            </div>
            <div className="mt-2 text-sm text-[#bccabb]">
              Notları ve linkleri çalışma alanından manuel kaydet.
            </div>

            <ul className="mt-4 space-y-2 text-sm text-[#bccabb]">
              <li>Not ve link kaydı</li>
              <li>Etiket ve arama</li>
              <li>Temel limitler</li>
            </ul>

            <button
              onClick={() => router.push("/dashboard")}
              className="mt-6 w-full rounded-lg border border-[#3d4a3e]/40 bg-[#0e0e0e] px-4 py-3 text-sm font-semibold text-[#f4f1ef] hover:bg-[#2a2a2a]"
            >
              Çalışma alanına git
            </button>
          </div>

          {/* Pro */}
          <div className="rounded-xl border border-emerald-300/35 bg-[#1c1b1b]/80 p-6 shadow-[0_24px_90px_rgba(80,255,160,0.08)] backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[#f4f1ef]">Pro</div>
              <div className="rounded-lg bg-emerald-300/15 px-3 py-1 text-xs text-emerald-300">
                Önerilen
              </div>
            </div>

            <div className="mt-2 text-3xl font-semibold text-[#f4f1ef]">
              {priceLoading ? (
                <span className="text-neutral-400">…</span>
              ) : price?.formatted ? (
                <>
                  {price.formatted}
                  <span className="text-base font-normal text-neutral-400">
                    {" "}
                    /{" "}
                    {price.interval === "month" ? "ay" : (price.interval ?? "")}
                  </span>
                </>
              ) : (
                <span className="text-red-300">Fiyat alınamadı</span>
              )}
            </div>

            {priceErr ? (
              <div className="mt-2 text-xs text-red-300">{priceErr}</div>
            ) : null}

            <div className="mt-2 text-sm text-[#bccabb]">
              Seçimleri ve linkleri sağ tıkla kaydet. Otomatik başlık,
              sınırsız kayıt ve AI destekli düzen.
            </div>

            <ul className="mt-4 space-y-2 text-sm text-[#e5e2e1]">
              <li>Tarayıcı eklentisi</li>
              <li>Sınırsız kayıt</li>
              <li>AI özet, etiket ve kategori</li>
            </ul>

            {isPro ? (
              <>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="mt-6 w-full rounded-lg border border-[#3d4a3e]/40 bg-[#0e0e0e] px-4 py-3 text-sm font-semibold text-[#f4f1ef] hover:bg-[#2a2a2a]"
                >
                  Pro hesabındasın
                </button>

                <button
                  onClick={openBillingPortal}
                  disabled={portalLoading}
                  className="mt-3 w-full rounded-lg border border-[#3d4a3e]/40 bg-[#0e0e0e] px-4 py-3 text-sm font-semibold text-[#f4f1ef] hover:bg-[#2a2a2a] disabled:opacity-60"
                >
                  {portalLoading
                    ? "Açılıyor…"
                    : "Faturalandırmayı yönet"}
                </button>
              </>
            ) : (
              <button
                onClick={startCheckout}
                disabled={checkoutLoading}
                className="mt-6 w-full rounded-lg bg-gradient-to-r from-emerald-300 to-teal-300 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:scale-[1.01] disabled:opacity-60"
              >
                {checkoutLoading ? "Yönlendiriliyor…" : "Pro’ya yükselt"}
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
