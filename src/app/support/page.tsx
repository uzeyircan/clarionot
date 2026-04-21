import Link from "next/link";
import Header from "@/components/Header";
import DnaBackdrop from "@/components/DnaBackdrop";

const helpCards = [
  {
    title: "Eklenti bağlanmıyor",
    body: "Extension yüklü mü, doğru domain üzerinde misin ve gizli pencere izinleri kapalı mı kontrol et. Ardından bağlantıyı tekrar dene.",
  },
  {
    title: "Pro veya ödeme",
    body: "Plan durumunu Pro sayfasından kontrol et. Ödeme sorunu varsa billing portal kart güncelleme ekranına yönlendirir.",
  },
  {
    title: "Veri dışa aktarma",
    body: "Ayarlar sayfasından Markdown, JSON veya CSV export alabilirsin. Bu dosyalar kayıtlarını başka araçlara taşıman için hazırlanır.",
  },
  {
    title: "AI sonuçları",
    body: "AI özet, etiket ve kategori üretir. Gerekirse kart üzerindeki yeniden üretme veya geri alma aksiyonlarını kullanabilirsin.",
  },
];

export default function SupportPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#131313] pb-16 text-[#e5e2e1]">
      <DnaBackdrop className="fixed opacity-30" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(107,251,154,0.08),transparent_42%),linear-gradient(to_bottom,transparent,#131313_82%)]" />
      <div className="fixed inset-x-0 top-0 z-50 border-b border-[#3d4a3e]/20 bg-[#131313]/70 px-5 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Header />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-5 pt-24 sm:px-6 lg:pt-28">
        <section className="rounded-xl border border-[#3d4a3e]/30 bg-[#201f1f]/70 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">
            Support
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
            Takıldığın yeri birlikte çözelim.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#bccabb]">
            Eklenti, Pro abonelik, export veya kayıt akışıyla ilgili en hızlı
            yol aşağıdaki kısa kontrollerdir.
          </p>
        </section>

        <section className="mt-6 grid gap-3 md:grid-cols-2">
          {helpCards.map((card) => (
            <article
              key={card.title}
              className="rounded-xl border border-[#3d4a3e]/30 bg-[#1c1b1b]/70 p-5 backdrop-blur-2xl"
            >
              <h2 className="text-lg font-black tracking-tight text-[#f4f1ef]">
                {card.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#bccabb]">
                {card.body}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-xl border border-[#3d4a3e]/30 bg-[#1c1b1b]/70 p-5 backdrop-blur-2xl sm:p-6">
          <h2 className="text-xl font-black tracking-tight text-[#f4f1ef]">
            Doğrudan iletişim
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#bccabb]">
            Hata mesajını, kullandığın tarayıcıyı ve mümkünse ekran görüntüsünü
            ekleyerek{" "}
            <a
              href="mailto:info@clarionot.com
"
              className="font-semibold text-emerald-300 underline-offset-4 hover:underline"
            >
              info@clarionot.com
            </a>{" "}
            adresine yaz.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/extension/connect"
              className="rounded-lg border border-[#3d4a3e]/40 bg-[#0e0e0e] px-5 py-3 text-center text-sm font-semibold transition hover:bg-[#2a2a2a]"
            >
              Eklentiyi bağla
            </Link>
            <Link
              href="/settings"
              className="rounded-lg bg-gradient-to-r from-emerald-300 to-teal-300 px-5 py-3 text-center text-sm font-semibold text-emerald-950 transition hover:scale-[1.01]"
            >
              Ayarlara git
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
