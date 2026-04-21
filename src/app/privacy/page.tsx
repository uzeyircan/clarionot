import Link from "next/link";
import Header from "@/components/Header";
import DnaBackdrop from "@/components/DnaBackdrop";

const updatedAt = "19 Nisan 2026";

const summaryCards = [
  {
    title: "Sen kaydedince işler",
    text: "ClarioNot ve ClarioNot Clip, notları ve linkleri yalnızca sen açıkça kaydettiğinde işler.",
  },
  {
    title: "Kontrol sende",
    text: "Kayıtlarını çalışma alanı üzerinden silebilir, ayarlar sayfasından Markdown, JSON veya CSV olarak dışa aktarabilirsin.",
  },
  {
    title: "Ödeme verisi ayrıdır",
    text: "Kart ve ödeme bilgileri Stripe tarafından işlenir; ClarioNot tam kart numarası saklamaz.",
  },
];

const sections = [
  {
    title: "Topladığımız Bilgiler",
    body: [
      "Hesap oluşturduğunda e-posta adresin ve Supabase Auth tarafından yönetilen kimlik bilgileri kullanılır.",
      "Çalışma alanına eklediğin başlık, içerik, link, not, etiket, grup, çalışma durumu, oluşturma ve güncelleme zamanları saklanır.",
      "Tema tercihin gibi ayarlar hesabına ve kullandığın cihaza kaydedilebilir.",
      "Pro plan için abonelik durumu, müşteri ve abonelik kimlikleri gibi faturalandırma kayıtları tutulur.",
    ],
  },
  {
    title: "ClarioNot Clip Eklentisi",
    body: [
      "Tarayıcı eklentisi, sağ tık menüsü veya eklenti arayüzüyle sen kaydet dediğinde seçtiğin URL'yi, seçili metni, notu, etiketi ve varsa grup seçimini ClarioNot hesabına gönderir.",
      "Eklentiyi bağlamak için üretilen erişim tokenının yalnızca hashlenmiş hali sunucuda saklanır. Eski eklenti tokenları yeni bağlantıda iptal edilir.",
      "Eklenti gezinme geçmişini, tüm açık sekmeleri, şifreleri, finansal verileri, konum bilgisini, klavye girişlerini veya arka plan etkinliğini izlemez.",
    ],
  },
  {
    title: "AI Özellikleri",
    body: [
      "Pro kullanıcılar için kaydedilen içerikler özet, etiket ve kategori üretmek amacıyla OpenAI API'lerine gönderilebilir.",
      "AI işlemi içerik türünü, mevcut başlığı, URL'yi ve not metnini kullanır. Üretilen özet, etiket ve kategori hesabındaki kayıtla birlikte saklanır.",
      "AI özellikleri reklam profili oluşturmak, kullanıcı takibi yapmak veya üçüncü taraflara pazarlama verisi sağlamak için kullanılmaz.",
    ],
  },
  {
    title: "Bilgileri Nasıl Kullanırız",
    body: [
      "Kayıtlarını çalışma alanında göstermek, arama, etiket, grup ve hatırlatma akışlarını çalıştırmak için kullanırız.",
      "Linklerden başlık çekmek, Pro planı doğrulamak, eklenti bağlantısını yönetmek ve ürün güvenliğini korumak için gerekli teknik işlemler yapılır.",
      "Ödeme başarılı veya başarısız olduğunda, e-posta bildirimleri etkinse hesabına servis bildirimi gönderilebilir.",
    ],
  },
  {
    title: "Paylaştığımız Servisler",
    body: [
      "Supabase, hesap yönetimi ve uygulama verilerinin saklanması için kullanılır.",
      "Stripe, abonelik ve ödeme işlemlerini yönetir. Tam kart bilgileri ClarioNot sunucularında saklanmaz.",
      "OpenAI, AI özetleme, etiketleme ve kategori özellikleri için kullanılabilir.",
      "Resend, ödeme ve hesapla ilgili servis e-postalarını göndermek için kullanılabilir.",
    ],
  },
  {
    title: "Saklama ve Silme",
    body: [
      "Kaydettiğin içerikler, hesabında tuttuğun sürece saklanır. Çalışma alanından tekil kayıtları silebilirsin.",
      "Bir grubu sildiğinde, o gruptaki kayıtlar silinmez; Inbox'a taşınır.",
      "Ayarlar sayfasından kayıtlarını Markdown, JSON veya CSV olarak dışa aktarabilirsin.",
      "Hesabın veya tüm verilerin için silme talebi göndermek istersen bizimle e-posta üzerinden iletişime geçebilirsin.",
    ],
  },
  {
    title: "Güvenlik",
    body: [
      "Uygulama istekleri HTTPS üzerinden yapılır. Eklenti erişim tokenları düz metin olarak saklanmaz.",
      "Sunucu tarafında hassas işlemler servis anahtarları ve iç erişim sırlarıyla korunur.",
      "Hiçbir sistem tamamen risksiz değildir; bu yüzden şüpheli bir durum fark edersen bizimle iletişime geçmeni isteriz.",
    ],
  },
  {
    title: "Çocukların Gizliliği",
    body: [
      "ClarioNot, 13 yaşın altındaki çocuklara yönelik değildir ve bilerek çocuklardan kişisel bilgi toplamaz.",
    ],
  },
];

function AccordionIcon() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#3d4a3e]/25 bg-[#0e0e0e]/70 text-lg leading-none text-emerald-300 transition group-open:rotate-45">
      +
    </span>
  );
}

export default function PrivacyPage() {
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
        <section className="overflow-hidden rounded-xl border border-[#3d4a3e]/30 bg-[#201f1f]/70 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-8 lg:p-10">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">
              Gizlilik
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Verin, hafızan ve kontrolün.
            </h1>
            <p className="mt-5 text-base leading-7 text-[#bccabb] sm:text-lg sm:leading-8">
              ClarioNot; notlarını, linklerini, etiketlerini ve gruplarını
              düzenlemek için çalışır. Bu politika, uygulamanın ve ClarioNot
              Clip tarayıcı eklentisinin hangi bilgileri işlediğini açıklar.
            </p>
            <p className="mt-4 text-sm text-[#bccabb]/70">
              Son güncelleme: {updatedAt}
            </p>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {summaryCards.map((card) => (
              <div
                key={card.title}
                className="rounded-lg border border-[#3d4a3e]/25 bg-[#0e0e0e]/60 p-4"
              >
                <h2 className="text-sm font-bold text-[#f4f1ef]">
                  {card.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#bccabb]">
                  {card.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.34fr_0.66fr]">
          <aside className="h-fit rounded-xl border border-[#3d4a3e]/30 bg-[#1c1b1b]/70 p-5 backdrop-blur-2xl lg:sticky lg:top-28">
            <h2 className="text-lg font-bold">Kısa Özet</h2>
            <p className="mt-3 text-sm leading-6 text-[#bccabb]">
              Reklam takibi yapmayız, gezinme geçmişini toplamayı amaçlamayız ve
              ödeme kartı bilgisini saklamayız. Ürünün çalışması için gereken
              hesap, içerik, abonelik ve eklenti bağlantı verilerini işleriz.
            </p>
            <div className="mt-5 grid gap-3">
              <Link
                href="/settings"
                className="rounded-lg border border-[#3d4a3e]/40 bg-[#0e0e0e] px-4 py-3 text-center text-sm font-semibold transition hover:bg-[#2a2a2a]"
              >
                Verileri dışa aktar
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg bg-gradient-to-r from-emerald-300 to-teal-300 px-4 py-3 text-center text-sm font-semibold text-emerald-950 transition hover:scale-[1.01]"
              >
                Çalışma alanına dön
              </Link>
            </div>
          </aside>

          <section className="rounded-xl border border-[#3d4a3e]/30 bg-[#1c1b1b]/70 p-4 backdrop-blur-2xl sm:p-5">
            <div className="grid gap-3">
              {sections.map((section, index) => (
                <details
                  key={section.title}
                  className="group rounded-lg border border-[#3d4a3e]/25 bg-[#0e0e0e]/45 open:bg-[#151515]/75"
                  open={index === 0}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 marker:hidden sm:p-5 [&::-webkit-details-marker]:hidden">
                    <span>
                      <span className="block text-lg font-black tracking-tight text-[#f4f1ef] sm:text-xl">
                        {section.title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[#bccabb]/62">
                        {section.body.length} madde
                      </span>
                    </span>
                    <AccordionIcon />
                  </summary>

                  <div className="grid gap-3 border-t border-[#3d4a3e]/20 px-4 pb-4 pt-1 sm:px-5 sm:pb-5">
                    {section.body.map((item) => (
                      <p
                        key={item}
                        className="rounded-lg border border-[#3d4a3e]/20 bg-[#0a0a0a]/55 p-4 text-sm leading-6 text-[#bccabb]"
                      >
                        {item}
                      </p>
                    ))}
                  </div>
                </details>
              ))}

              <article>
                <h2 className="text-xl font-black tracking-tight text-[#f4f1ef]">
                  İletişim
                </h2>
                <p className="mt-4 rounded-lg border border-[#3d4a3e]/20 bg-[#0e0e0e]/45 p-4 text-sm leading-6 text-[#bccabb]">
                  Gizlilik politikası, veri dışa aktarma veya veri silme
                  talepleri için{" "}
                  <a
                    href="mailto:info@clarionot.com"
                    className="font-semibold text-emerald-300 underline-offset-4 hover:underline"
                  >
                    info@clarionot.com
                  </a>{" "}
                  adresinden bize ulaşabilirsin.
                </p>
              </article>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
