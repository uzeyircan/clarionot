import Link from "next/link";
import Header from "@/components/Header";
import DnaBackdrop from "@/components/DnaBackdrop";

const rows = [
  [
    "Abonelik yönetimi",
    "Pro aboneliğini Stripe billing portal üzerinden yönetebilir veya iptal edebilirsin.",
  ],
  [
    "İade talebi",
    "Yanlışlıkla satın alma, teknik erişim sorunu veya yinelenen ödeme gibi durumlarda bize e-posta ile ulaşabilirsin.",
  ],
  [
    "Değerlendirme",
    "İade taleplerini ödeme tarihi, kullanım durumu ve teknik sorun bağlamına göre makul şekilde değerlendiririz.",
  ],
  [
    "Kart bilgileri",
    "Ödeme ve kart bilgileri Stripe tarafından işlenir; ClarioNot tam kart numarası saklamaz.",
  ],
];

export default function RefundPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#131313] pb-16 text-[#e5e2e1]">
      <DnaBackdrop className="fixed opacity-30" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(107,251,154,0.08),transparent_42%),linear-gradient(to_bottom,transparent,#131313_82%)]" />
      <div className="fixed inset-x-0 top-0 z-50 border-b border-[#3d4a3e]/20 bg-[#131313]/70 px-5 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Header />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-5 pt-24 sm:px-6 lg:pt-28">
        <section className="rounded-xl border border-[#3d4a3e]/30 bg-[#201f1f]/70 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">
            Refund
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
            İade politikası.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#bccabb]">
            Pro aboneliğinle ilgili ödeme veya erişim sorunu yaşarsan hızlıca
            çözmek için bizimle iletişime geçebilirsin.
          </p>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          {rows.map(([title, body]) => (
            <article
              key={title}
              className="rounded-xl border border-[#3d4a3e]/30 bg-[#1c1b1b]/70 p-5 backdrop-blur-2xl"
            >
              <h2 className="text-lg font-black tracking-tight text-[#f4f1ef]">
                {title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#bccabb]">{body}</p>
            </article>
          ))}
        </section>

        <div className="mt-6 rounded-xl border border-[#3d4a3e]/30 bg-[#1c1b1b]/70 p-5 text-sm leading-6 text-[#bccabb] backdrop-blur-2xl">
          İade veya ödeme soruları için{" "}
          <a
            href="mailto:info@clarionot.com
"
            className="font-semibold text-emerald-300 underline-offset-4 hover:underline"
          >
            info@clarionot.com
          </a>{" "}
          adresine yazabilirsin.
        </div>

        <Link
          href="/pro"
          className="mt-6 inline-flex rounded-lg bg-gradient-to-r from-emerald-300 to-teal-300 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:scale-[1.01]"
        >
          Pro sayfasına dön
        </Link>
      </div>
    </main>
  );
}
