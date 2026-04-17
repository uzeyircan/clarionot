"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import DnaBackdrop from "@/components/DnaBackdrop";
import { supabase } from "@/lib/supabase";
import { useProPrice } from "@/lib/useProPrice";

const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/clarionot-clip/iadmjpgdbncmblmjbgbiljaobnlhgomo?authuser=0&hl=tr";

const benefitRows = [
  ["Sağ tıkla kaydetme (eklenti)", "-", "✓"],
  ["Linklerden otomatik başlık", "✓", "✓"],
  ["Etiketler ve arama", "✓", "✓"],
  ["Sınırsız kayıt", "-", "✓"],
  ["Öncelikli güncellemeler", "-", "✓"],
];

type PlanRow = {
  plan: "free" | "pro" | null;
  status: string | null;
  current_period_end: string | null;
  grace_until: string | null;
};

export default function HomePage() {
  const router = useRouter();
  const [isProUser, setIsProUser] = useState(false);
  const [checkedPlan, setCheckedPlan] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [checkingPlan, setCheckingPlan] = useState(true);
  const [hasPaymentIssue, setHasPaymentIssue] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { price: proPrice, loading: proPriceLoading } = useProPrice();

  const [activeShot, setActiveShot] = useState<
    "webstore" | "procard" | "rightclick" | "modal"
  >("webstore");

  const shots = useMemo(
    () => [
      {
        key: "webstore" as const,
        kpi: "1/4",
        title: "Chrome Web Store",
        desc: "Eklentiyi tek tıkla kur.",
        badge: "Kur",
        src: "/landing/ss-1-webstore.png",
      },
      {
        key: "procard" as const,
        kpi: "2/4",
        title: "Pro’dan bağlan",
        desc: "Tarayıcı eklentisini hesabınla eşleştir.",
        badge: "Bağlan",
        src: "/landing/ss-2-pro-card.png",
      },
      {
        key: "rightclick" as const,
        kpi: "3/4",
        title: "Sağ tıkla kaydet",
        desc: "Sekme değiştirmeden sayfa, link veya seçili metin kaydet.",
        badge: "Yakalama",
        src: "/landing/ss-3-rightclick.png",
      },
      {
        key: "modal" as const,
        kpi: "4/4",
        title: "Bağlam ekle",
        desc: "Kaydetmeden önce başlık, açıklama, etiket ve grup ekle.",
        badge: "Bağlam",
        src: "/landing/ss-4-modal.png",
      },
    ],
    [],
  );

  const active = shots.find((s) => s.key === activeShot) ?? shots[0];

  const initials = useMemo(() => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) return "U";
    return normalizedEmail[0].toUpperCase();
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
        setIsProUser(false);
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
      setIsProUser(isPro);
      setHasPaymentIssue(row.status === "past_due" || row.status === "unpaid");
    } finally {
      setCheckingPlan(false);
      setCheckedPlan(true);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const uid = session?.user?.id;
      const mail = session?.user?.email ?? "";

      setIsAuthed(!!uid);
      setEmail(mail);

      if (!uid) {
        setPlan("free");
        setIsProUser(false);
        setHasPaymentIssue(false);
        setCheckingPlan(false);
        setCheckedPlan(true);
        return;
      }

      fetchPlan(uid);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const uid = session?.user?.id ?? null;
        const mail = session?.user?.email ?? "";

        setIsAuthed(!!session);
        setEmail(mail);

        if (uid) {
          fetchPlan(uid);
        } else {
          setPlan("free");
          setIsProUser(false);
          setHasPaymentIssue(false);
          setCheckingPlan(false);
          setCheckedPlan(true);
        }
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const startProCheckout = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      window.location.href = "/login";
      return;
    }

    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      alert(json?.error || "Ödeme başlatılamadı.");
      return;
    }

    const checkoutUrl = json?.checkoutUrl || json?.url;
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
      return;
    }

    alert("Ödeme sayfası henüz hazır değil.");
  };

  const goDashboard = () => {
    window.location.href = "/dashboard";
  };

  const goLogin = () => {
    window.location.href = "/login";
  };

  const logout = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/login");
  };

  const primaryCTA = isAuthed ? (
    <button
      onClick={goDashboard}
      className="rounded-full bg-gradient-to-r from-emerald-300 to-teal-300 px-8 py-3 text-sm font-semibold text-emerald-950 shadow-[0_0_30px_rgba(107,251,154,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_0_34px_rgba(107,251,154,0.32)]"
    >
      Dashboard’a git
    </button>
  ) : (
    <button
      onClick={goLogin}
      className="rounded-full bg-gradient-to-r from-emerald-300 to-teal-300 px-8 py-3 text-sm font-semibold text-emerald-950 shadow-[0_0_30px_rgba(107,251,154,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_0_34px_rgba(107,251,154,0.32)]"
    >
      Ücretsiz başla
    </button>
  );

  return (
    <main className="min-h-screen bg-[#131313] text-[#e5e2e1] selection:bg-emerald-300/30">
      <nav className="fixed top-0 z-50 w-full bg-zinc-950/40 shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-screen-2xl items-center justify-between px-6 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-emerald-300/30 bg-emerald-300/10 text-lg text-emerald-300">
              c
            </span>
            <span className="text-2xl font-black tracking-tight text-zinc-100">
              clarionot
            </span>
          </Link>

          <div className="hidden items-center gap-10 md:flex">
            <a
              href="#vision"
              className="border-b border-emerald-300/50 text-sm font-medium tracking-tight text-emerald-300 transition hover:text-emerald-200"
            >
              Vizyon
            </a>
            <a
              href="#solutions"
              className="rounded px-2 py-1 text-sm font-medium tracking-tight text-zinc-400 transition hover:bg-white/5 hover:text-emerald-200"
            >
              Çözümler
            </a>
            <a
              href="#pricing"
              className="rounded px-2 py-1 text-sm font-medium tracking-tight text-zinc-400 transition hover:bg-white/5 hover:text-emerald-200"
            >
              Fiyatlandırma
            </a>
          </div>

          <div className="flex items-center gap-2">
            {!isAuthed ? (
              <>
                <a
                  href="#pricing"
                  className="hidden rounded-full border border-[#3d4a3e]/70 px-4 py-2 text-xs font-semibold text-[#e5e2e1] transition hover:bg-white/5 sm:inline-flex"
                >
                  Planlar
                </a>
                <button
                  onClick={goLogin}
                  className="rounded-full bg-gradient-to-r from-emerald-300 to-teal-300 px-6 py-2 text-sm font-medium text-emerald-950 transition hover:scale-105 active:scale-95"
                >
                  Giriş
                </button>
              </>
            ) : (
              <>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    plan === "pro"
                      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-300"
                      : "border-zinc-600/40 bg-zinc-500/10 text-zinc-300"
                  }`}
                  title={checkingPlan ? "Plan is being checked" : undefined}
                >
                  {checkingPlan ? "..." : plan === "pro" ? "PRO" : "FREE"}
                </span>

                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((value) => !value)}
                    className="inline-flex items-center gap-3 rounded-full border border-[#3d4a3e]/50 bg-[#131313]/70 px-3 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-[#1c1b1b]"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#2a2a2a] text-[13px] font-bold text-emerald-200">
                      {initials}
                    </span>
                    {hasPaymentIssue ? (
                      <span className="rounded-full border border-red-400/25 bg-red-500/15 px-2 py-1 text-[11px] font-semibold text-red-200">
                        !
                      </span>
                    ) : null}
                  </button>

                  {menuOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 mt-3 w-64 overflow-hidden rounded-xl border border-[#3d4a3e]/40 bg-[#0e0e0e] text-left shadow-2xl"
                    >
                      <div className="border-b border-[#3d4a3e]/25 px-4 py-3">
                        <div className="text-[11px] text-zinc-500">
                          Hesap
                        </div>
                        <div className="mt-0.5 truncate text-xs text-zinc-200">
                          {email || "-"}
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
                          className={`mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-white/5 ${
                            hasPaymentIssue
                              ? "text-amber-200"
                              : "text-zinc-200"
                          }`}
                        >
                          {hasPaymentIssue
                            ? "Ödeme sorunu"
                            : plan === "pro"
                              ? "Faturalandırma"
                              : "Pro’ya yükselt"}
                        </Link>

                        <Link
                          role="menuitem"
                          href="/settings"
                          onClick={() => setMenuOpen(false)}
                          className="mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
                        >
                          Ayarlar ve export
                        </Link>

                        <div className="my-2 border-t border-[#3d4a3e]/25" />

                        <button
                          role="menuitem"
                          onClick={logout}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-950/30"
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
        </div>
      </nav>

      <header className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[#101111]" />
          <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(107,251,154,0.32)_1px,transparent_1px),linear-gradient(90deg,rgba(68,226,205,0.24)_1px,transparent_1px)] [background-size:72px_72px]" />
          <DnaBackdrop className="opacity-70" />
          <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#131313] to-transparent" />
          <div className="absolute left-1/2 top-1/2 h-[720px] w-[920px] -translate-x-1/2 -translate-y-1/2 rounded-[8px] border border-[#3d4a3e]/20 bg-[#1c1b1b]/35 shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm" />
          <div className="absolute left-[8%] top-[22%] hidden w-72 rounded-[8px] border border-[#3d4a3e]/30 bg-[#201f1f]/70 p-4 text-left shadow-2xl backdrop-blur-xl md:block">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-emerald-300">
                Notlar
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
            </div>
            <div className="h-3 w-44 rounded bg-[#e5e2e1]/70" />
            <div className="mt-3 h-2 w-full rounded bg-[#bccabb]/30" />
            <div className="mt-2 h-2 w-4/5 rounded bg-[#bccabb]/20" />
            <div className="mt-5 flex gap-2">
              <span className="rounded bg-[#353534] px-2 py-1 text-[10px] text-emerald-200">
                #fikir
              </span>
              <span className="rounded bg-[#353534] px-2 py-1 text-[10px] text-teal-200">
                #ürün
              </span>
            </div>
          </div>
          <div className="absolute right-[8%] top-[30%] hidden w-80 rounded-[8px] border border-[#3d4a3e]/30 bg-[#201f1f]/70 p-4 text-left shadow-2xl backdrop-blur-xl lg:block">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-teal-300">
                Linkler
              </span>
              <span className="text-[10px] text-[#bccabb]/60">AI</span>
            </div>
            <div className="h-3 w-56 rounded bg-[#e5e2e1]/70" />
            <div className="mt-3 h-2 w-full rounded bg-[#bccabb]/25" />
            <div className="mt-2 h-2 w-3/5 rounded bg-[#bccabb]/20" />
            <div className="mt-5 h-9 rounded-[8px] border border-teal-300/20 bg-teal-300/10" />
          </div>
          <div className="absolute bottom-[18%] left-1/2 hidden w-[520px] -translate-x-1/2 grid-cols-3 gap-3 opacity-70 md:grid">
            {["Kaydet", "Etiketle", "Bul"].map((label) => (
              <div
                key={label}
                className="rounded-[8px] border border-[#3d4a3e]/25 bg-[#0e0e0e]/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#bccabb] backdrop-blur-xl"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-[#131313]/45" />
        </div>

        <div className="relative z-10 max-w-5xl pt-20">
          <h1 className="text-5xl font-black tracking-tight text-[#e5e2e1] drop-shadow-[0_0_20px_rgba(107,251,154,0.22)] md:text-8xl">
            Kaydettiğin şeyler{" "}
            <span className="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
              unutulmasın.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl font-light tracking-tight text-[#bccabb] md:text-2xl">
            Okunacak linkleri, fikirleri ve notları işleme kuyruğuna al.
            Sonra, Bugün, İşleniyor ve Tamamlandı akışıyla pasif arşivi temizle.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {primaryCTA}
            <a
              href="#solutions"
              className="rounded-full border border-[#3d4a3e]/70 px-8 py-3 text-sm font-medium text-[#e5e2e1] transition hover:bg-white/5"
            >
              Vizyon
            </a>
          </div>
        </div>

        <a
          href="#vision"
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-4xl text-white/30 transition hover:text-emerald-300"
          aria-label="Scroll to vision"
        >
          ↓
        </a>
      </header>

      <section id="vision" className="bg-[#131313] px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="text-sm font-bold uppercase tracking-[0.35em] text-emerald-300">
                Çalışma Akışı
              </div>
              <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
                Kaydet. Kuyruğa al. Bitir.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[#bccabb]">
              clarionot sadece saklama alanı değil. Kaydettiğin her şey için
              küçük bir sonraki adım belirleyebileceğin kişisel işleme kuyruğu.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Kaydet",
                body: "Link, not, seçili metin veya fikir. Bağlamı kaçırmadan yakala.",
              },
              {
                step: "02",
                title: "Kuyruğa al",
                body: "Sonra, Bugün, İşleniyor veya Tamamlandı durumuyla niyetini netleştir.",
              },
              {
                step: "03",
                title: "Bitir",
                body: "Aç, oku, karar ver. Gerekirse arşivle, gruba taşı veya sil.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-[#3d4a3e]/25 bg-[#201f1f]/70 p-8 shadow-[0_18px_60px_rgba(0,0,0,0.2)] backdrop-blur-2xl"
              >
                <div className="text-sm font-black text-emerald-300">
                  {item.step}
                </div>
                <h3 className="mt-6 text-2xl font-black">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#bccabb]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="solutions" className="bg-[#131313] px-6 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.35em] text-emerald-300">
                Eklenti Akışı
              </div>
              <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
                Sağ tıkla. Kaydet. Devam et.
              </h2>
            </div>
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="w-fit rounded-full border border-[#3d4a3e]/70 px-6 py-3 text-sm font-semibold transition hover:bg-white/5"
            >
              Eklentiyi kur
            </a>
          </div>

          <div className="grid gap-8 lg:grid-cols-12">
            <div className="grid gap-3 lg:col-span-4">
              {shots.map((shot) => {
                const isActive = shot.key === activeShot;
                return (
                  <button
                    key={shot.key}
                    onClick={() => setActiveShot(shot.key)}
                    className={`rounded-xl border p-5 text-left transition ${
                      isActive
                        ? "border-emerald-300/50 bg-emerald-300/10"
                        : "border-[#3d4a3e]/30 bg-[#1c1b1b] hover:bg-[#201f1f]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#bccabb]">
                        {shot.kpi}
                      </span>
                      <span className="rounded-full bg-black/20 px-3 py-1 text-xs text-emerald-200">
                        {shot.badge}
                      </span>
                    </div>
                    <div className="mt-3 text-lg font-bold">{shot.title}</div>
                    <div className="mt-2 text-sm text-[#bccabb]">
                      {shot.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-8">
              <div className="overflow-hidden rounded-xl border border-[#3d4a3e]/30 bg-[#0e0e0e]">
                <div className="flex items-center justify-between border-b border-[#3d4a3e]/20 px-5 py-4 text-sm text-[#bccabb]">
                  <span>{active.kpi}</span>
                  <span className="font-semibold text-[#e5e2e1]">
                    {active.title}
                  </span>
                  <span>{active.badge}</span>
                </div>
                <div className="group relative aspect-[16/9] w-full">
                  <Image
                    src={active.src}
                    alt={active.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-[1.04]"
                    sizes="(max-width: 1024px) 100vw, 820px"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-[#0e0e0e] px-6 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="overflow-x-auto rounded-xl border border-[#3d4a3e]/30">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-black/20 text-[#e5e2e1]">
                <tr>
                  <th className="px-5 py-5 font-bold">Avantajlar</th>
                  <th className="px-5 py-5 font-bold">Free</th>
                  <th className="px-5 py-5 font-bold">Pro</th>
                </tr>
              </thead>
              <tbody>
                {benefitRows.map(([label, free, pro]) => (
                  <tr key={label} className="border-t border-[#3d4a3e]/20">
                    <td className="px-5 py-4">{label}</td>
                    <td className="px-5 py-4 text-[#bccabb]">{free}</td>
                    <td className="px-5 py-4 text-emerald-300">{pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <button
              onClick={() => (isAuthed ? goDashboard() : goLogin())}
              className="rounded-xl border border-[#3d4a3e]/30 bg-[#131313] p-8 text-left transition hover:bg-[#1c1b1b]"
            >
              <div className="text-sm font-bold">Free</div>
              <div className="mt-3 text-4xl font-black">₺0</div>
              <p className="mt-3 text-sm text-[#bccabb]">
                Notları ve linkleri dashboard’dan manuel kaydet.
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                <li>• Notlar ve linkler</li>
                <li>• Etiketler ve arama</li>
                <li>• Temel limitler</li>
              </ul>
              <div className="mt-8 rounded-lg border border-[#3d4a3e]/40 bg-[#1c1b1b] px-5 py-3 text-center text-sm font-bold">
                Dashboard’a git
              </div>
            </button>

            <div className="rounded-xl border border-emerald-300/30 bg-[#131313] p-8">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold">Pro</div>
                <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs text-emerald-300">
                  Önerilen
                </span>
              </div>

              <div className="mt-3 text-4xl font-black text-emerald-100">
                {proPriceLoading
                  ? "Yükleniyor..."
                  : proPrice?.formatted
                    ? `${proPrice.formatted}`
                    : "Fiyat alınamadı"}
              </div>
              <p className="mt-3 text-sm text-[#bccabb]">
                Seçimleri ve linkleri sağ tıkla kaydet. Otomatik başlık.
                Sınırsız kayıt.
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                <li>• Tarayıcı eklentisiyle sağ tık kaydetme</li>
                <li>• Sınırsız kayıt</li>
                <li>• Öncelikli geliştirmeler</li>
              </ul>

              {isProUser ? (
                <button
                  onClick={goDashboard}
                  className="mt-8 w-full rounded-lg border border-[#3d4a3e]/40 bg-[#1c1b1b] px-5 py-3 text-center text-sm font-bold transition hover:bg-[#201f1f]"
                >
                  Pro hesabındasın ✓
                </button>
              ) : (
                <button
                  onClick={startProCheckout}
                  disabled={!checkedPlan}
                  className="mt-8 w-full rounded-lg bg-gradient-to-r from-emerald-300 to-teal-300 px-5 py-3 text-center text-sm font-bold text-emerald-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Pro’ya yükselt
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#131313] px-6 py-32 md:py-48">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(68,226,205,0.08)_0%,transparent_52%)]" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="mb-8 text-4xl font-black tracking-tight md:text-6xl">
            Sonra bakarım dediklerini temizle.
          </h2>
          <p className="mx-auto mb-12 max-w-xl text-lg text-[#bccabb]">
            Dashboard’u aç, Chrome’dan yakala ve her linki kendi bağlamıyla
            birlikte tut.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            {primaryCTA}
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#3d4a3e]/70 px-8 py-3 text-sm font-semibold transition hover:bg-white/5"
            >
              Eklentiyi kur
            </a>
          </div>
        </div>
      </section>

      <footer className="w-full border-t border-zinc-800/20 bg-zinc-950 py-16">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-10 md:flex-row">
          <div className="flex flex-col items-center gap-4 md:items-start">
            <div className="flex items-center gap-2 text-xl font-bold text-zinc-100">
              <span className="grid h-7 w-7 place-items-center rounded-full border border-emerald-300/30 text-sm text-emerald-300">
                c
              </span>
              clarionot
            </div>
            <p className="text-sm uppercase tracking-widest text-zinc-500">
              © {new Date().getFullYear()} CLARIONOT. ALL RIGHTS RESERVED.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <a
              className="text-sm uppercase tracking-widest text-zinc-500 opacity-80 transition hover:text-emerald-300 hover:opacity-100"
              href="#vision"
            >
              Vizyon
            </a>
            <a
              className="text-sm uppercase tracking-widest text-zinc-500 opacity-80 transition hover:text-emerald-300 hover:opacity-100"
              href="#solutions"
            >
              Çözümler
            </a>
            <Link
              className="text-sm uppercase tracking-widest text-zinc-500 opacity-80 transition hover:text-emerald-300 hover:opacity-100"
              href="/privacy"
            >
              Gizlilik
            </Link>
            <a
              className="text-sm uppercase tracking-widest text-zinc-500 opacity-80 transition hover:text-emerald-300 hover:opacity-100"
              href="#pricing"
            >
              Fiyatlandırma
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
