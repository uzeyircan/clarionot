"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/clario-clip/iadmjpgdbncmblmjbgbiljaobnlhgomo?authuser=0&hl=tr";

export default function HomePage() {
  const [isProUser, setIsProUser] = useState(false);
  const [checkedPlan, setCheckedPlan] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

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
        .select("plan,status")
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

    // endpoint henüz hazır değilse
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
      Dashboard’a Git
    </button>
  ) : (
    <button
      onClick={goLogin}
      className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 transition"
    >
      Giriş Yap / Kayıt Ol
    </button>
  );

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Header />

        {/* HERO */}
        <section className="mt-10 grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Kişisel bilgi kasan
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Önemli olanı kaydet.
              <br />
              İhtiyacın olduğunda anında bul.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-300 sm:text-base">
              Clario, internette karşılaştığın değerli linkleri, notları ve
              fikirleri kaybolmayan bir kişisel hafızaya dönüştürür.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              {primaryCTA}

              <div className="text-xs text-neutral-500">
                {isAuthed
                  ? "Kayıtların seni bekliyor"
                  : "Kredi kartı gerekmez · 30 saniyede kur"}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-xs text-neutral-400">
              <span className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1">
                Link + açıklama
              </span>
              <span className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1">
                Etiket
              </span>
              <span className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1">
                Hızlı arama
              </span>
            </div>
          </div>

          {/* PREVIEW */}
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

            <Link
              href="/dashboard"
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-100 hover:bg-neutral-800 transition"
            >
              Demo gibi gör → Dashboard
            </Link>

            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-neutral-900 transition"
            >
              Sağ tıkla kaydetmeyi aç → Extension’ı kur
            </a>
          </div>
        </section>

        {/* CLARIO CLIP */}
        <section className="mt-12 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-emerald-200">
                Clario Clip (Chrome Extension)
              </div>
              <p className="mt-1 text-sm text-emerald-100">
                İnternette gördüğün linkleri ve seçtiğin metinleri{" "}
                <span className="font-semibold">
                  sağ tık → Clario’ya Kaydet
                </span>{" "}
                ile tek hamlede arşivle.
              </p>
              <p className="mt-2 text-xs text-emerald-200/80">
                Kurulumdan sonra ekstra ayar yok. Giriş yapınca otomatik
                bağlanır.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-400 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-emerald-300 transition"
              >
                Extension’ı Kur
              </a>
              <div className="text-xs text-emerald-200/80 text-center sm:text-right">
                20 sn · ücretsiz kurulum
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/20 bg-neutral-950/40 p-4">
              <div className="text-xs text-emerald-200/80">1) Kur</div>
              <div className="mt-1 text-sm text-emerald-100 font-semibold">
                Chrome Web Store
              </div>
              <p className="mt-1 text-sm text-emerald-100/90">
                “Extension’ı Kur” butonuna bas.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-neutral-950/40 p-4">
              <div className="text-xs text-emerald-200/80">2) Giriş Yap</div>
              <div className="mt-1 text-sm text-emerald-100 font-semibold">
                Clario hesabınla
              </div>
              <p className="mt-1 text-sm text-emerald-100/90">
                Giriş yapınca extension otomatik bağlanır.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-neutral-950/40 p-4">
              <div className="text-xs text-emerald-200/80">3) Kaydet</div>
              <div className="mt-1 text-sm text-emerald-100 font-semibold">
                Sağ tık → Kaydet
              </div>
              <p className="mt-1 text-sm text-emerald-100/90">
                Linke sağ tıkla: “Clario’ya Kaydet”.
              </p>
            </div>
          </div>
        </section>

        {/* PROBLEM */}
        <section className="mt-12 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
          <h2 className="text-sm font-semibold text-neutral-200">
            Bunlar sana tanıdık geliyor mu?
          </h2>

          <ul className="mt-4 grid gap-3 text-sm text-neutral-300 sm:grid-cols-2">
            <li className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              “Buna sonra bakarım” deyip kaybettiğin linkler
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

          <p className="mt-4 text-sm text-neutral-400">Bilgi çok, düzen yok.</p>
        </section>

        {/* HOW IT WORKS */}
        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <div className="text-xs text-neutral-400">1) Kaydet</div>
            <div className="mt-1 text-sm font-semibold text-neutral-200">
              Link, not, fikir
            </div>
            <p className="mt-2 text-sm text-neutral-300">
              Tek tıkla ekle. “Sonra bakarım” dediğin şey kaybolmasın.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <div className="text-xs text-neutral-400">2) Anlam kat</div>
            <div className="mt-1 text-sm font-semibold text-neutral-200">
              Açıklama + etiket
            </div>
            <p className="mt-2 text-sm text-neutral-300">
              Neden önemli olduğunu yaz. Etiketle.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <div className="text-xs text-neutral-400">3) Bul</div>
            <div className="mt-1 text-sm font-semibold text-neutral-200">
              Saniyede geri getir
            </div>
            <p className="mt-2 text-sm text-neutral-300">
              Aylar sonra bile arama ile hemen bul.
            </p>
          </div>
        </section>

        {/* WHY */}
        <section className="mt-12">
          <h2 className="text-sm font-semibold text-neutral-200">
            Neden Clario?
          </h2>

          <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-800">
            <div className="grid grid-cols-2 bg-neutral-950 text-sm">
              <div className="border-b border-neutral-800 p-4 font-semibold text-neutral-200">
                Diğer Notlar
              </div>
              <div className="border-b border-neutral-800 p-4 font-semibold text-neutral-200">
                Clario
              </div>

              <div className="border-b border-neutral-800 p-4 text-neutral-300">
                Sadece yazarsın
              </div>
              <div className="border-b border-neutral-800 p-4 text-neutral-300">
                Bağlamıyla saklarsın
              </div>

              <div className="border-b border-neutral-800 p-4 text-neutral-300">
                Link karmaşası
              </div>
              <div className="border-b border-neutral-800 p-4 text-neutral-300">
                Link + açıklama
              </div>

              <div className="border-b border-neutral-800 p-4 text-neutral-300">
                Zayıf arama
              </div>
              <div className="border-b border-neutral-800 p-4 text-neutral-300">
                Etiket + güçlü arama
              </div>

              <div className="p-4 text-neutral-300">Günlük notlar</div>
              <div className="p-4 text-neutral-300">Uzun vadeli hafıza</div>
            </div>
          </div>

          <p className="mt-4 text-sm text-neutral-400">
            Not almak geçicidir.{" "}
            <span className="text-neutral-200">Hatırlamak kalıcıdır.</span>
          </p>
        </section>

        {/* PRICING (Pro ise gizle) */}
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
                <li>• 50 kayıt limiti (not + link toplam)</li>
                <li>• Arama</li>
                <li>• Etiketleme</li>
                <li>• Manuel ekleme (dashboard’dan)</li>
              </ul>

              <p className="mt-4 text-xs text-neutral-500">
                Tıkla ve kullanmaya başla.
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
                    99 TL / ay
                  </div>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                  En iyi deneyim
                </span>
              </div>

              <ul className="mt-4 space-y-2 text-sm text-emerald-100">
                <li>• Sınırsız kayıt</li>
                <li>• Clario Clip ile sağ tık → tek tık kaydetme</li>
                <li>• Daha hızlı “ikinci beyin” akışı</li>
                <li>• Yeni özelliklere erken erişim (yakında)</li>
              </ul>

              <p className="mt-4 text-xs text-emerald-200/80">
                Tıkla → Ödeme ekranına git → otomatik yenilenen Pro’yu aç.
              </p>
            </div>
          </section>
        ) : null}

        {/* FINAL CTA */}
        <section className="mt-12 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
          <h2 className="text-lg font-semibold text-neutral-200">
            Bilgiyi kaybetmeyi bırak
          </h2>
          <p className="mt-2 text-sm text-neutral-300">
            Clario ile önemli olan her şey tek yerde.
          </p>

          <div className="mt-5">{primaryCTA}</div>
        </section>

        <footer className="mt-10 pb-6 text-xs text-neutral-500">
          © {new Date().getFullYear()} Clario
        </footer>
      </div>
    </main>
  );
}
