import Link from "next/link";
import Header from "@/components/Header";
import DnaBackdrop from "@/components/DnaBackdrop";

const sections = [
  {
    title: "Kullanım",
    body: "ClarioNot; link, not, etiket ve grup bazlı kişisel bilgi yönetimi için sunulur. Uygulamayı yasalara aykırı içerik saklamak, kötüye kullanım yapmak veya hizmeti bozacak otomasyonlar çalıştırmak için kullanamazsın.",
  },
  {
    title: "Hesap",
    body: "Hesabındaki içerikten ve giriş bilgilerinin güvenliğinden sen sorumlusun. Şüpheli bir erişim fark edersen bizimle iletişime geçebilirsin.",
  },
  {
    title: "Pro Abonelik",
    body: "Pro plan; tarayıcı eklentisi, sınırsız kayıt ve AI destekli özellikler gibi ek imkanlar sağlar. Abonelik ve ödeme işlemleri Stripe üzerinden yönetilir.",
  },
  {
    title: "Servis Değişiklikleri",
    body: "Ürünü geliştirdikçe özellikleri değiştirebilir, ekleyebilir veya kaldırabiliriz. Kritik değişikliklerde kullanıcıları makul şekilde bilgilendirmeye çalışırız.",
  },
  {
    title: "Sorumluluk",
    body: "ClarioNot içeriklerini düzenlemene yardımcı olur; kaydettiğin içeriklerin doğruluğunu, yasal uygunluğunu veya üçüncü taraf sitelerin sürekliliğini garanti etmez.",
  },
];

export default function TermsPage() {
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
            Terms
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
            Kullanım şartları.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#bccabb]">
            ClarioNot’u kullanarak bu şartları kabul etmiş olursun. Son
            güncelleme: 19 Nisan 2026.
          </p>
        </section>

        <section className="mt-6 grid gap-3">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-xl border border-[#3d4a3e]/30 bg-[#1c1b1b]/70 p-5 backdrop-blur-2xl"
            >
              <h2 className="text-xl font-black tracking-tight text-[#f4f1ef]">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#bccabb]">
                {section.body}
              </p>
            </article>
          ))}
        </section>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/privacy"
            className="rounded-lg border border-[#3d4a3e]/40 bg-[#0e0e0e] px-5 py-3 text-center text-sm font-semibold transition hover:bg-[#2a2a2a]"
          >
            Gizlilik politikası
          </Link>
          <Link
            href="/support"
            className="rounded-lg bg-gradient-to-r from-emerald-300 to-teal-300 px-5 py-3 text-center text-sm font-semibold text-emerald-950 transition hover:scale-[1.01]"
          >
            Destek al
          </Link>
        </div>
      </div>
    </main>
  );
}
