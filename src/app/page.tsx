// app/page.tsx
import Header from "@/components/Header";
import Link from "next/link";

export default function HomePage() {
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
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 transition"
              >
                Ücretsiz Başla
              </Link>

              <div className="text-xs text-neutral-500">
                Kredi kartı gerekmez · 30 saniyede kur
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

        {/* PRICING LITE */}
        <section className="mt-12 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <div className="text-sm font-semibold text-neutral-200">Free</div>
            <ul className="mt-3 space-y-2 text-sm text-neutral-300">
              <li>• Not & link kaydetme</li>
              <li>• Arama</li>
              <li>• Etiketleme</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
            <div className="text-sm font-semibold text-emerald-200">Pro</div>
            <ul className="mt-3 space-y-2 text-sm text-emerald-100">
              <li>• Daha fazla kayıt</li>
              <li>• Güçlü arşiv</li>
              <li>• Öncelikli özellikler (yakında)</li>
            </ul>
            <p className="mt-3 text-xs text-emerald-200/80">
              Pro, Clario’yu ikinci beynine dönüştürür.
            </p>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="mt-12 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
          <h2 className="text-lg font-semibold text-neutral-200">
            Bilgiyi kaybetmeyi bırak
          </h2>
          <p className="mt-2 text-sm text-neutral-300">
            Clario ile önemli olan her şey tek yerde.
          </p>

          <div className="mt-5">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 transition"
            >
              Şimdi Ücretsiz Başla
            </Link>
          </div>
        </section>

        <footer className="mt-10 pb-6 text-xs text-neutral-500">
          © {new Date().getFullYear()} Clario
        </footer>
      </div>
    </main>
  );
}
