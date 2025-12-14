import Link from "next/link";
import Header from "../components/Header";
export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <Header></Header>
        <section className="mt-14">
          <h1 className="text-4xl sm:text-5xl font-semibold leading-tight">
            Kaydettiğin hiçbir şeyi{" "}
            <span className="text-neutral-300">bir daha kaybetme.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-neutral-300">
            Clario linklerini ve notlarını tek yerde toplar. Aradığını saniyeler
            içinde bulmanı sağlar.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-neutral-100 px-5 py-3 text-sm font-medium text-neutral-950 hover:bg-neutral-200"
            >
              Ücretsiz Başla
            </Link>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center rounded-xl border border-neutral-800 px-5 py-3 text-sm font-medium text-neutral-100 hover:bg-neutral-900"
            >
              Fiyatlandırma
            </a>
          </div>
        </section>
        <section className="mt-16 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <div className="text-lg">🔍</div>
            <h3 className="mt-3 text-sm font-semibold">Bulmak için yapılmış</h3>
            <p className="mt-2 text-sm text-neutral-300">
              Etiket + arama ile kaydettiğin şeyi anında bul.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <div className="text-lg">🧱</div>
            <h3 className="mt-3 text-sm font-semibold">Basit, premium, net</h3>
            <p className="mt-2 text-sm text-neutral-300">
              Gereksiz özellik yok. Sadece iş.
            </p>
          </div>
        </section>
        <section id="pricing" className="mt-16">
          <h2 className="text-xl font-semibold">Fiyatlandırma</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
              <div className="text-sm font-semibold">Free</div>
              <div className="mt-2 text-3xl font-semibold">₺0</div>
              <ul className="mt-4 space-y-2 text-sm text-neutral-300">
                <li>• 50 kayıt</li>
                <li>• Temel arama</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-neutral-700 bg-neutral-950 p-6">
              <div className="text-sm font-semibold">Pro</div>
              <div className="mt-2 text-3xl font-semibold">
                ₺99<span className="text-sm text-neutral-400">/ay</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-neutral-300">
                <li>• Sınırsız kayıt</li>
                <li>• Etiketler</li>
                <li>• Gelişmiş arama</li>
              </ul>
            </div>
          </div>
        </section>
        <footer className="mt-16 border-t border-neutral-900 pt-8 text-sm text-neutral-500">
          Basit. Güvenli. Premium. — Clario
        </footer>
      </div>
    </main>
  );
}
