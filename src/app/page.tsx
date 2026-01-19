"use client";

import Header from "@/components/Header";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProPrice } from "@/lib/useProPrice";

const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/clarionot-clip/iadmjpgdbncmblmjbgbiljaobnlhgomo?authuser=0&hl=tr";

export default function HomePage() {
  const [isProUser, setIsProUser] = useState(false);
  const [checkedPlan, setCheckedPlan] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const { price: proPrice, loading: proPriceLoading } = useProPrice();

  // ✅ Product tour state
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
        title: "Pro’da Tarayıcı Eklentisi kartı",
        desc: "İlk kez bağlan → sonra kullanım hazır.",
        badge: "Bağlan",
        src: "/landing/ss-2-pro-card.png",
      },
      {
        key: "rightclick" as const,
        kpi: "3/4",
        title: "Sağ tık → clarionot’ya Kaydet",
        desc: "Sayfayı/linki/seçili metni anında kaydet.",
        badge: "Sağ tık",
        src: "/landing/ss-3-rightclick.png",
      },
      {
        key: "modal" as const,
        kpi: "4/4",
        title: "Modal ile bağlam ekle",
        desc: "Başlık/açıklama/etiket + group seç → Kaydet.",
        badge: "Bağlam",
        src: "/landing/ss-4-modal.png",
      },
    ],
    [],
  );

  const active = shots.find((s) => s.key === activeShot) ?? shots[0];

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const uid = session?.user?.id;

      setIsAuthed(!!uid);

      if (!uid) {
        setCheckedPlan(true);
        return;
      }

      const { data: planRow } = await supabase
        .from("user_plan")
        .select("plan,status,current_period_end,grace_until")
        .eq("user_id", uid)
        .maybeSingle();

      setIsProUser(planRow?.plan === "pro" && planRow?.status === "active");
      setCheckedPlan(true);
    })();
  }, []);

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

    if (json?.checkoutUrl) {
      window.location.href = json.checkoutUrl;
      return;
    }

    alert("Ödeme sayfası henüz hazır değil. (checkoutUrl gelmedi)");
  };

  const goDashboard = () => {
    window.location.href = "/dashboard";
  };

  const goLogin = () => {
    window.location.href = "/login";
  };

  const primaryCTA = isAuthed ? (
    <button
      onClick={goDashboard}
      className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 transition"
    >
      Dashboard’a git
    </button>
  ) : (
    <button
      onClick={goLogin}
      className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 transition"
    >
      Ücretsiz başla
    </button>
  );

  const secondaryCTA = (
    <a
      href="#how"
      className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-neutral-900 transition"
    >
      Nasıl çalışıyor?
    </a>
  );

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Header />

        {/* 1) HERO */}
        <section className="mt-10 grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Unutulanları yakala
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Kaydettiğini unutanlar için
              <br />
              ikinci beyin.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-300 sm:text-base">
              clarionot, kaydedip bir daha açmadığın notları/linkleri ortaya
              çıkarır. “Sonra bakarım” dediklerini önüne koyar:{" "}
              <span className="text-neutral-100 font-semibold">
                Aç / Sil / Ertele
              </span>
              .
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              {primaryCTA}
              {secondaryCTA}

              <div className="text-xs text-neutral-500 sm:ml-2">
                {isAuthed
                  ? "Kayıtların seni bekliyor"
                  : "Kredi kartı gerekmez · 30 saniyede kur"}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-xs text-neutral-400">
              <span className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1">
                Unutulanları gör
              </span>
              <span className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1">
                Aç / Sil / Ertele
              </span>
              <span className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1">
                Sağ tıkla kaydet (Pro)
              </span>
            </div>
          </div>

          {/* Preview (sadece mood) */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <div className="text-xs text-neutral-400">Örnek görünüm</div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                <div className="text-xs text-neutral-500">
                  🔗 Link · 17.12.2025 14:00
                </div>
                <div className="mt-1 text-sm font-semibold text-neutral-200 line-clamp-1">
                  React Hooks – pratik rehber
                </div>
                <div className="mt-2 text-sm text-neutral-300 break-all">
                  https://react.dev/learn
                </div>
                <div className="mt-1 text-sm text-neutral-400 line-clamp-2">
                  “useEffect ne zaman kullanılır?” kısmı çok iyi anlatıyor.
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                <div className="text-xs text-neutral-500">
                  📝 Not · 17.12.2025 13:40
                </div>
                <div className="mt-1 text-sm font-semibold text-neutral-200 line-clamp-1">
                  SaaS fikri
                </div>
                <div className="mt-2 text-sm text-neutral-400 line-clamp-3">
                  İnsanlar linkleri kaybediyor. Çözüm: link + bağlam + etiket +
                  hızlı arama.
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <Link
                href="/dashboard"
                className="inline-flex w-full items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-100 hover:bg-neutral-800 transition"
              >
                Dashboard’ı aç
              </Link>

              <a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-neutral-900 transition"
              >
                Extension’ı kur
              </a>
            </div>
          </div>
        </section>

        {/* 2) PROBLEM */}
        <section className="mt-12 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
          <h2 className="text-sm font-semibold text-neutral-200">
            Bunlar sana tanıdık geliyor mu?
          </h2>

          <ul className="mt-4 grid gap-3 text-sm text-neutral-300 sm:grid-cols-2">
            <li className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              “Buna sonra bakarım” deyip bir daha açmadığın linkler
            </li>
            <li className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              20 açık sekme… hangisi önemliydi hatırlamamak
            </li>
            <li className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              Not aldın ama neden aldığını unutmak
            </li>
            <li className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              Aylar sonra arayıp bulamamak
            </li>
          </ul>

          <p className="mt-4 text-sm text-neutral-400">
            Sorun bilgi değil.{" "}
            <span className="text-neutral-200">Geri dönmemek.</span>
          </p>
        </section>

        {/* 3) ÇÖZÜM / HOW */}
        <section id="how" className="mt-12 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <div className="text-xs text-neutral-400">1) Kaydet</div>
            <div className="mt-1 text-sm font-semibold text-neutral-200">
              Link, not, fikir
            </div>
            <p className="mt-2 text-sm text-neutral-300">
              Kaydetmek kolay. Zaten onu yapıyorsun.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <div className="text-xs text-neutral-400">2) Unut</div>
            <div className="mt-1 text-sm font-semibold text-neutral-200">
              (Evet, bu normal)
            </div>
            <p className="mt-2 text-sm text-neutral-300">
              Çoğu kayıt “sonra” diye kalır. Sonra gelmez.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <div className="text-xs text-neutral-400">3) Geri getir</div>
            <div className="mt-1 text-sm font-semibold text-neutral-200">
              Unutulanları gör
            </div>
            <p className="mt-2 text-sm text-neutral-300">
              clarionot sana açılmayanları gösterir: Aç / Sil / Ertele.
            </p>
          </div>
        </section>

        {/* 4) 🔥 HERO FEATURE: EXTENSION + TOUR */}
        <section className="mt-12 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Sağ tık → Kaydet → Unutma
              </div>

              <h2 className="mt-3 text-lg font-semibold text-emerald-100">
                30 saniyede kur. Refleks gibi kaydet.
              </h2>
              <p className="mt-2 text-sm text-emerald-100/90">
                clarionot Clip ile internette gördüğün şeyi sağ tıkla
                yakalarsın. Sonra “unutulanlar” ekranında yüzleşirsin.
              </p>
              <p className="mt-2 text-xs text-emerald-200/80">
                Aşağıdaki adımlara tıkla. Görselin üzerine gelince yakınlaşır.
              </p>
            </div>

            <div className="flex gap-2">
              <a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-100 hover:bg-neutral-800 transition"
              >
                Extension’ı kur
              </a>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 transition"
              >
                Dashboard
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-12">
            {/* Left: steps */}
            <div className="lg:col-span-4">
              <div className="grid gap-2">
                {shots.map((s) => {
                  const isActive = s.key === activeShot;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setActiveShot(s.key)}
                      className={`text-left rounded-2xl border p-4 transition ${
                        isActive
                          ? "border-emerald-500/40 bg-emerald-500/10"
                          : "border-neutral-800 bg-neutral-950 hover:bg-neutral-900/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-neutral-400">{s.kpi}</div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] ${
                            isActive
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                              : "border-neutral-800 bg-neutral-900/20 text-neutral-300"
                          }`}
                        >
                          {s.badge}
                        </span>
                      </div>
                      <div
                        className={`mt-2 text-sm font-semibold ${
                          isActive ? "text-emerald-100" : "text-neutral-200"
                        }`}
                      >
                        {s.title}
                      </div>
                      <div className="mt-1 text-sm text-neutral-400">
                        {s.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: screenshot */}
            <div className="lg:col-span-8">
              <div className="rounded-2xl border border-neutral-800 bg-black/20 p-3">
                <div className="flex items-center justify-between px-2 pb-3">
                  <div className="text-xs text-neutral-400">{active.kpi}</div>
                  <div className="text-xs font-semibold text-neutral-100">
                    {active.title}
                  </div>
                  <div className="text-xs text-neutral-400">{active.badge}</div>
                </div>

                <div className="group relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
                  <div className="absolute left-4 top-3 z-10 flex gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                  </div>

                  <div className="relative aspect-[16/9] w-full">
                    <Image
                      src={active.src}
                      alt={active.title}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-[1.06]"
                      sizes="(max-width: 1024px) 100vw, 760px"
                      priority
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2">
                  {shots.map((s) => {
                    const isActive = s.key === activeShot;
                    return (
                      <button
                        key={s.key}
                        onClick={() => setActiveShot(s.key)}
                        className={`relative overflow-hidden rounded-xl border bg-neutral-950 transition ${
                          isActive
                            ? "border-emerald-500/40"
                            : "border-neutral-800 hover:border-neutral-700"
                        }`}
                        title={s.title}
                      >
                        <div className="relative aspect-[16/10] w-full">
                          <Image
                            src={s.src}
                            alt={s.title}
                            fill
                            className="object-cover"
                            sizes="200px"
                          />
                        </div>
                        <div className="px-2 py-1 text-[10px] text-neutral-400 line-clamp-1">
                          {s.badge}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 text-xs text-emerald-200/80">
                  Pro’da sağ tıkla tek tık kaydetme. Free’da manuel kaydetme.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5) WHY */}
        <section className="mt-12">
          <h2 className="text-sm font-semibold text-neutral-200">
            Neden clarionot?
          </h2>

          <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-800">
            <div className="grid grid-cols-2 bg-neutral-950 text-sm">
              <div className="border-b border-neutral-800 p-4 font-semibold text-neutral-200">
                Diğer Notlar
              </div>
              <div className="border-b border-neutral-800 p-4 font-semibold text-neutral-200">
                clarionot
              </div>

              <div className="border-b border-neutral-800 p-4 text-neutral-300">
                Yazarsın ve kalabalık büyür
              </div>
              <div className="border-b border-neutral-800 p-4 text-neutral-300">
                Unutulanları geri getirir
              </div>

              <div className="border-b border-neutral-800 p-4 text-neutral-300">
                “Bir gün bakarım”
              </div>
              <div className="border-b border-neutral-800 p-4 text-neutral-300">
                “Bugün yüzleş”
              </div>

              <div className="border-b border-neutral-800 p-4 text-neutral-300">
                Link karmaşası
              </div>
              <div className="border-b border-neutral-800 p-4 text-neutral-300">
                Link + bağlam + etiket
              </div>

              <div className="p-4 text-neutral-300">Arşiv büyür</div>
              <div className="p-4 text-neutral-300">
                Arşiv temizlenir ve işe yarar
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm text-neutral-400">
            Not almak kolay.{" "}
            <span className="text-neutral-200">Geri dönmek zordur.</span>
          </p>
        </section>

        {/* 6) PRICING (Pro ise gizle) */}
        {checkedPlan && !isProUser ? (
          <section className="mt-12 grid gap-4 sm:grid-cols-2">
            {/* FREE */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => (isAuthed ? goDashboard() : goLogin())}
              onKeyDown={(e) =>
                e.key === "Enter" && (isAuthed ? goDashboard() : goLogin())
              }
              className="cursor-pointer rounded-2xl border border-neutral-800 bg-neutral-950 p-6 hover:bg-neutral-900/40 transition"
            >
              <div className="text-sm font-semibold text-neutral-200">Free</div>
              <div className="mt-1 text-xs text-neutral-500">0 TL</div>

              <ul className="mt-4 space-y-2 text-sm text-neutral-300">
                <li>• Unutulanlar: 7+ gün (açılmayan / bakılmayan)</li>
                <li>• Aç / Sil</li>
                <li>• Arama</li>
                <li>• Manuel ekleme (dashboard’dan)</li>
              </ul>

              <p className="mt-4 text-xs text-neutral-500">
                Denemek için yeterli. Rahat etmek için değil.
              </p>
            </div>

            {/* PRO */}
            <div
              role="button"
              tabIndex={0}
              onClick={startProCheckout}
              onKeyDown={(e) => e.key === "Enter" && startProCheckout()}
              className="cursor-pointer rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 hover:bg-emerald-500/15 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-emerald-200">
                    Pro
                  </div>
                  <div className="mt-1 text-xs text-emerald-200/80">
                    {proPriceLoading
                      ? "…"
                      : proPrice?.formatted
                        ? `${proPrice.formatted} / ay`
                        : "Fiyat yüklenemedi"}
                  </div>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                  Unutulanlar + Snooze
                </span>
              </div>

              <ul className="mt-4 space-y-2 text-sm text-emerald-100">
                <li>• Unutulanlar: 30 / 60 / 90+ seçilebilir</li>
                <li>• Snooze: seçili unutulanlar için Ertele</li>
                <li>• Sağ tık → tek tık kaydetme (Extension)</li>
                <li>• Yeni özelliklere erken erişim (yakında)</li>
              </ul>

              <p className="mt-4 text-xs text-emerald-200/80">
                Tıkla → ödeme ekranı → Pro aktif.
              </p>
            </div>
          </section>
        ) : null}

        {/* 7) FINAL CTA */}
        <section className="mt-12 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
          <h2 className="text-lg font-semibold text-neutral-200">
            Unutulanları temizle
          </h2>
          <p className="mt-2 text-sm text-neutral-300">
            Kaydetmek kolay. Geri dönmek zor. clarionot bunu senin yerine
            başlatır.
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            {primaryCTA}
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-neutral-900 transition"
            >
              Extension’ı kur
            </a>
          </div>
        </section>

        <footer className="mt-10 pb-6 text-xs text-neutral-500">
          © {new Date().getFullYear()} clarionot
        </footer>
      </div>
    </main>
  );
}
