"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  motion,
  useMotionTemplate,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
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

type ShotKey = "webstore" | "procard" | "rightclick" | "modal";

type Shot = {
  key: ShotKey;
  kpi: string;
  title: string;
  desc: string;
  badge: string;
  src: string;
};

const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: "blur(10px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
};

const features = [
  {
    title: "Her Şeyi Kaydet",
    copy: "Notlar, linkler, seçili metinler ve yarım kalmış fikirler tek sakin çalışma alanında birikir.",
    eyebrow: "Yakalama",
  },
  {
    title: "Akıllı Hatırlatma",
    copy: "Unuttuğun kayıtlar, tekrar işe yarayabilecekleri anda görünür hale gelir.",
    eyebrow: "Geri Getirme",
  },
  {
    title: "Gruplarla Düzenle",
    copy: "Benzer fikirleri yaşayan gruplarda topla; ikinci beynin klasör yüküne dönüşmesin.",
    eyebrow: "Düzen",
  },
  {
    title: "Pro Hafıza Katmanı",
    copy: "Eklentiyle hızlı yakalama, sınırsız kayıt ve daha güçlü bir üretkenlik akışı.",
    eyebrow: "Pro",
  },
];

const storyCards = [
  {
    title: "Geçen haftadan kalan okuma",
    meta: "Okuma listesi",
    body: "Ürün yönünü değiştirirken ekiplerin bağlamı nasıl koruduğuna dair not.",
  },
  {
    title: "Fiyatlandırma fikri",
    meta: "Ürün",
    body: "Çok kaydedip az geri dönen kullanıcılar için hatırlatma ve grupları birlikte anlat.",
  },
  {
    title: "Kullanıcı cümlesi",
    meta: "Araştırma",
    body: "Her şeyi kaydediyorum, sonra kaydettiğim yerin içinde tekrar kaybediyorum.",
  },
];

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
  const [activeShot, setActiveShot] = useState<ShotKey>("webstore");

  const shots = useMemo<Shot[]>(
    () => [
      {
        key: "webstore",
        kpi: "1/4",
        title: "Chrome Web Store",
        desc: "Eklentiyi tek tıkla kur.",
        badge: "Kur",
        src: "/landing/ss-1-webstore.png",
      },
      {
        key: "procard",
        kpi: "2/4",
        title: "Pro’dan bağlan",
        desc: "Tarayıcı eklentisini hesabınla eşleştir.",
        badge: "Bağlan",
        src: "/landing/ss-2-pro-card.png",
      },
      {
        key: "rightclick",
        kpi: "3/4",
        title: "Sağ tıkla kaydet",
        desc: "Sekme değiştirmeden sayfa, link veya seçili metin kaydet.",
        badge: "Yakalama",
        src: "/landing/ss-3-rightclick.png",
      },
      {
        key: "modal",
        kpi: "4/4",
        title: "Bağlam ekle",
        desc: "Kaydetmeden önce başlık, açıklama, etiket ve grup ekle.",
        badge: "Bağlam",
        src: "/landing/ss-4-modal.png",
      },
    ],
    [],
  );

  const active = shots.find((shot) => shot.key === activeShot) ?? shots[0];

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
      className="accent-gradient theme-accent-glow inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition hover:opacity-90"
    >
      Çalışma alanına git
    </button>
  ) : (
    <button
      onClick={goLogin}
      className="accent-gradient theme-accent-glow inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition hover:opacity-90"
    >
      Ücretsiz başla
    </button>
  );

  return (
    <main className="min-h-screen overflow-hidden bg-[#030406] text-white selection:bg-cyan-300/25">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="theme-hero-glow absolute inset-0" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:72px_72px]" />
      </div>

      <SiteNav
        isAuthed={isAuthed}
        plan={plan}
        checkingPlan={checkingPlan}
        hasPaymentIssue={hasPaymentIssue}
        email={email}
        initials={initials}
        menuOpen={menuOpen}
        menuRef={menuRef}
        setMenuOpen={setMenuOpen}
        goLogin={goLogin}
        logout={logout}
      />
      <HeroSection primaryCTA={primaryCTA} />
      <StorySection />
      <FeaturesSection />
      <DashboardShowcase />
      <ExtensionFlow
        active={active}
        activeShot={activeShot}
        setActiveShot={setActiveShot}
        shots={shots}
      />
      <PricingSection
        checkedPlan={checkedPlan}
        goDashboard={goDashboard}
        goLogin={goLogin}
        isAuthed={isAuthed}
        isProUser={isProUser}
        proPriceFormatted={proPrice?.formatted}
        proPriceLoading={proPriceLoading}
        startProCheckout={startProCheckout}
      />
      <FinalCta primaryCTA={primaryCTA} />
      <SiteFooter />
    </main>
  );
}

function SiteNav({
  isAuthed,
  plan,
  checkingPlan,
  hasPaymentIssue,
  email,
  initials,
  menuOpen,
  menuRef,
  setMenuOpen,
  goLogin,
  logout,
}: {
  isAuthed: boolean;
  plan: "free" | "pro";
  checkingPlan: boolean;
  hasPaymentIssue: boolean;
  email: string;
  initials: string;
  menuOpen: boolean;
  menuRef: RefObject<HTMLDivElement>;
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
  goLogin: () => void;
  logout: () => void;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.06] bg-[#030406]/58 backdrop-blur-2xl"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="theme-chip theme-accent-glow grid h-9 w-9 place-items-center rounded-lg text-sm font-black backdrop-blur-xl">
            c
          </span>
          <span className="text-sm font-semibold tracking-[0.22em] text-white/85 sm:text-base">
            clarionot
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-white/58 md:flex">
          <a href="#story" className="transition hover:text-white">
            Hatırlatma
          </a>
          <a href="#features" className="transition hover:text-white">
            Özellikler
          </a>
          <a href="#workspace" className="transition hover:text-white">
            Çalışma Alanı
          </a>
          <a href="#pricing" className="transition hover:text-white">
            Fiyatlandırma
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {!isAuthed ? (
            <>
              <a
                href="#pricing"
                className="hidden rounded-lg border border-white/10 bg-white/[0.035] px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/[0.07] hover:text-white sm:inline-flex"
              >
                Planlar
              </a>
              <button
                onClick={goLogin}
                className="accent-gradient rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90"
              >
                Giriş
              </button>
            </>
          ) : (
            <>
              <span
                className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                  plan === "pro"
                    ? "border-cyan-200/20 bg-cyan-200/10 text-cyan-50"
                    : "border-white/10 bg-white/[0.045] text-white/62"
                }`}
                title={checkingPlan ? "Plan kontrol ediliyor" : undefined}
              >
                {checkingPlan ? "..." : plan === "pro" ? "PRO" : "FREE"}
              </span>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((value) => !value)}
                  className="inline-flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[13px] font-bold text-[#030406]">
                    {initials}
                  </span>
                  {hasPaymentIssue ? (
                    <span className="rounded-md border border-red-400/25 bg-red-500/15 px-2 py-1 text-[11px] font-semibold text-red-200">
                      !
                    </span>
                  ) : null}
                </button>

                {menuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 mt-3 w-64 overflow-hidden rounded-xl border border-white/10 bg-[#07090d] text-left shadow-2xl shadow-black/50"
                  >
                    <div className="border-b border-white/10 px-4 py-3">
                      <div className="text-[11px] text-white/38">Hesap</div>
                      <div className="mt-0.5 truncate text-xs text-white/78">
                        {email || "-"}
                      </div>
                    </div>

                    <div className="p-2">
                      <Link
                        role="menuitem"
                        href="/dashboard"
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-white/78 hover:bg-white/[0.06]"
                      >
                        Çalışma Alanı
                      </Link>

                      <Link
                        role="menuitem"
                        href="/pro"
                        onClick={() => setMenuOpen(false)}
                        className={`mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-white/[0.06] ${
                          hasPaymentIssue ? "text-amber-200" : "text-white/78"
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
                        className="mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-white/78 hover:bg-white/[0.06]"
                      >
                        Ayarlar ve export
                      </Link>

                      <div className="my-2 border-t border-white/10" />

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
    </motion.header>
  );
}

function HeroSection({ primaryCTA }: { primaryCTA: ReactNode }) {
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const yOne = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const yTwo = useTransform(scrollYProgress, [0, 1], [0, 84]);
  const yThree = useTransform(scrollYProgress, [0, 1], [0, -46]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const opacity = useTransform(scrollYProgress, [0, 0.82], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative flex min-h-screen items-center px-5 pb-24 pt-32 sm:px-8 lg:pt-40"
    >
      <div className="mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-[1.02fr_0.98fr]">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.12 } },
          }}
          className="relative z-10 max-w-4xl"
        >
          <motion.div
            variants={fadeUp}
            className="mb-6 inline-flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2 text-sm text-white/68 backdrop-blur-xl"
          >
            <span className="accent-bg h-2 w-2 rounded-full shadow-[0_0_24px_color-mix(in_srgb,var(--clarionot-accent)_75%,transparent)]" />
            Fikirlerin bir daha kaybolmasın
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="max-w-5xl text-balance text-5xl font-semibold leading-[0.94] tracking-[-0.04em] text-white sm:text-7xl lg:text-8xl"
          >
            Sonra bakarım dediğin fikirler kaybolmasın.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-8 max-w-2xl text-pretty text-lg leading-8 text-white/62 sm:text-xl"
          >
            ClarioNot notları, linkleri ve yarım kalmış fikirleri kaydeder;
            unutulanları zamanı geldiğinde tekrar önüne getirir.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-10 flex flex-col gap-3 sm:flex-row">
            {primaryCTA}
            <Link
              href="#workspace"
              className="inline-flex items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white/82 backdrop-blur-xl transition hover:bg-white/[0.08] hover:text-white"
            >
              Çalışma alanını incele
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          style={{ opacity, scale }}
          className="relative mx-auto h-[520px] w-full max-w-[560px] lg:h-[650px]"
        >
          <motion.div style={{ y: yOne }} className="absolute left-1 top-16 sm:left-4">
            <FloatingCard
              label="Note"
              title="Lansman cümlesi"
              body="Fikirler kaybolmaz. Doğru anı bekler."
              accent="cyan"
            />
          </motion.div>
          <motion.div style={{ y: yTwo }} className="absolute right-0 top-44 z-10">
            <FloatingCard
              label="Link"
              title="Hafıza tasarımı"
              body="Sakin bir hatırlatma sistemi, kalabalık bir arşivden daha değerlidir."
              accent="violet"
            />
          </motion.div>
          <motion.div style={{ y: yThree }} className="absolute bottom-14 left-10 sm:left-20">
            <FloatingCard
              label="Geri döndü"
              title="Unutuldu ama işe yarıyor"
              body="19 gün önce kaydedildi. Bugünkü planlama için ilgili."
              accent="mint"
            />
          </motion.div>
          <motion.div
            animate={{ rotate: [0, 3, 0], y: [0, -10, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-[32px] border border-white/10 bg-white/[0.045] shadow-[0_40px_160px_rgba(80,190,255,0.18)] backdrop-blur-2xl"
          >
            <div className="absolute inset-6 rounded-2xl border border-white/8 bg-[#07090d]/70 p-5">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-xs font-medium text-white/42">Bugün</span>
                <span className="rounded-lg bg-cyan-300/12 px-2 py-1 text-xs text-cyan-100">
                  3 geri dönüş
                </span>
              </div>
              <div className="space-y-3">
                {["Fiyat notu", "Araştırma linki", "Toplantı fikri"].map((item, index) => (
                  <div
                    key={item}
                    className="rounded-lg border border-white/8 bg-white/[0.045] p-3"
                  >
                    <div className="h-2 w-20 rounded-full bg-white/20" />
                    <div
                      className="mt-3 h-2 rounded-full bg-white/10"
                      style={{ width: `${72 - index * 10}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function FloatingCard({
  label,
  title,
  body,
  accent,
}: {
  label: string;
  title: string;
  body: string;
  accent: "cyan" | "violet" | "mint";
}) {
  const accentClass =
    accent === "cyan"
      ? "from-cyan-300/22"
      : accent === "violet"
        ? "from-violet-300/18"
        : "from-emerald-300/18";

  return (
    <motion.article
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 180, damping: 18 }}
      className={`w-64 rounded-xl border border-white/10 bg-gradient-to-br ${accentClass} to-white/[0.035] p-4 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:w-72`}
    >
      <div className="mb-5 flex items-center justify-between">
        <span className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-xs text-white/58">
          {label}
        </span>
        <span className="h-2 w-2 rounded-full bg-white/55" />
      </div>
      <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/58">{body}</p>
    </motion.article>
  );
}

function StorySection() {
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const blur = useTransform(scrollYProgress, [0.15, 0.45, 0.72], [0, 14, 0]);
  const y = useTransform(scrollYProgress, [0.12, 0.48, 0.78], [80, -120, 0]);
  const scale = useTransform(scrollYProgress, [0.15, 0.48, 0.78], [1, 0.86, 1]);
  const opacity = useTransform(scrollYProgress, [0.1, 0.42, 0.72], [1, 0.24, 1]);
  const filter = useMotionTemplate`blur(${blur}px)`;

  return (
    <section id="story" ref={ref} className="relative px-5 py-28 sm:px-8 lg:py-40">
      <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-20%" }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
        >
          <motion.p variants={fadeUp} className="text-sm font-medium text-cyan-200/80">
            Kaybolma ve geri dönüş
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl"
          >
            Arşiv bulanıklaşır. Doğru fikir geri gelir.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-6 max-w-xl text-lg leading-8 text-white/58">
            Kaydetmek işin sadece yarısı. ClarioNot, unutulmuş bir kaydın
            yeniden işe yaradığı ikinci an için tasarlandı.
          </motion.p>
        </motion.div>

        <div className="relative min-h-[560px]">
          <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-cyan-200/30 to-transparent" />
          {storyCards.map((card, index) => (
            <motion.article
              key={card.title}
              className="absolute left-1/2 w-[min(92vw,520px)] -translate-x-1/2 rounded-xl border border-white/10 bg-[#070a0e]/82 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl"
              transition={{ delay: index * 0.08 }}
              initial={{ rotate: index === 0 ? -4 : index === 1 ? 3 : -1 }}
              animate={{ rotate: index === 0 ? -2 : index === 1 ? 2 : 1 }}
              viewport={{ once: false }}
              style={{
                y,
                scale,
                opacity,
                filter,
                top: `${index * 112 + 80}px`,
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-md bg-white/[0.06] px-2 py-1 text-xs text-white/48">
                  {card.meta}
                </span>
                <span className="text-xs text-cyan-100/70">sonra döner</span>
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-white">
                {card.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-white/56">{card.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="px-5 py-28 sm:px-8 lg:py-36">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-15%" }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
          className="max-w-3xl"
        >
          <motion.p variants={fadeUp} className="text-sm font-medium text-violet-100/78">
            Biriken fikirler için
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl"
          >
            Gün boyu fikir toplayanlar için daha sakin bir sistem.
          </motion.h2>
        </motion.div>

        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {features.map((feature, index) => (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 30, scale: 0.98, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-12%" }}
              transition={{ duration: 0.7, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-300/[0.08] via-transparent to-violet-300/[0.08] opacity-0 transition duration-500 group-hover:opacity-100" />
              <div className="relative">
                <div className="mb-10 flex items-center justify-between">
                  <span className="rounded-md border border-white/10 bg-white/[0.055] px-2 py-1 text-xs text-white/54">
                    {feature.eyebrow}
                  </span>
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.06] text-sm text-white/52">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="text-2xl font-semibold tracking-[-0.03em] text-white">
                  {feature.title}
                </h3>
                <p className="mt-4 max-w-xl text-base leading-7 text-white/56">{feature.copy}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardShowcase() {
  const ref = useRef<HTMLElement | null>(null);

  return (
    <section
      id="workspace"
      ref={ref}
      className="relative px-5 py-20 sm:px-8 sm:py-24 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 sm:gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:gap-12">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-sm font-medium text-cyan-100/78"
            >
              Çalışma alanı turu
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="mt-4 max-w-3xl text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl"
            >
              Her kayıt için net bir çalışma masası.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.7 }}
              className="mt-5 max-w-xl text-base leading-7 text-white/58 sm:mt-6 sm:text-lg sm:leading-8"
            >
              Çalışma alanı sadece bir liste değil. Gelen kutusu, gruplar,
              unutulanlar, işleme durumu, arama ve AI etiketleri aynı ekranda
              çalışır.
            </motion.p>

            <div className="mt-6 grid gap-3 text-sm text-white/58">
              {[
                "Yeni link ve notlar önce Inbox’a düşer.",
                "Gruplar ve etiketler kayıtları bağlama göre ayırır.",
                "Unutulanlar bölümü eski ama hâlâ değerli kayıtları geri çağırır.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#06080c]/95 shadow-[0_28px_90px_rgba(0,0,0,0.5)] sm:shadow-[0_60px_180px_rgba(0,0,0,0.62)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 bg-white/[0.035] px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex gap-1.5 sm:gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300/70 sm:h-3 sm:w-3" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-200/70 sm:h-3 sm:w-3" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/70 sm:h-3 sm:w-3" />
        </div>
        <span className="truncate text-[11px] text-white/38 sm:text-xs">
          clarionot.app/workspace
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[190px_1fr] lg:grid-cols-[220px_1fr]">
        <aside className="hidden border-b border-white/8 bg-white/[0.025] p-5 md:block md:border-b-0 md:border-r">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-sm font-black text-[#030406]">
              c
            </span>
            <div>
              <p className="text-sm font-semibold">ClarioNot</p>
              <p className="text-xs text-white/38">Hafıza katmanı</p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              ["Inbox", "14"],
              ["Unutulanlar", "7"],
              ["Bugün bak", "5"],
              ["Tamamlanan", "28"],
            ].map(([item, count], index) => (
              <div
                key={item}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  index === 1
                    ? "bg-cyan-300/12 text-cyan-50"
                    : "text-white/50"
                }`}
              >
                <span>{item}</span>
                <span className="text-xs text-white/34">{count}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/34">
              Kısayol
            </p>
            <p className="mt-1 text-xs leading-5 text-white/48">
              Ctrl/⌘ + K ile tüm kayıtlarında ara.
            </p>
          </div>
        </aside>

        <div className="p-4 sm:p-6 lg:p-7">
          <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div>
              <p className="text-xs text-white/42 sm:text-sm">
                Pulse Çalışma Alanı
              </p>
              <h3 className="mt-1 max-w-xl text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
                Bugün neyi işleyeceğini net gör.
              </h3>
            </div>
            <div className="w-fit rounded-lg border border-cyan-200/18 bg-cyan-200/10 px-2.5 py-1.5 text-xs text-cyan-50 sm:px-3 sm:py-2 sm:text-sm">
              7 unutulan kayıt geri döndü
            </div>
          </div>

          <div className="mb-4 grid gap-2 sm:grid-cols-4">
            {[
              ["Toplam", "54"],
              ["Not", "22"],
              ["Link", "32"],
              ["Bugün", "5"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-white/10 bg-white/[0.035] p-3"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/34">
                  {label}
                </p>
                <p className="mt-1 text-xl font-semibold text-cyan-100">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {["Tümü", "Inbox", "Unutulanlar", "Bugün bak"].map(
              (filter, index) => (
                <span
                  key={filter}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    index === 2
                      ? "bg-white text-[#030406]"
                      : "bg-white/[0.055] text-white/58"
                  }`}
                >
                  {filter}
                </span>
              ),
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                type: "not",
                title: "Geri döndü: roadmap notu",
                desc: "19 gün önce kaydedildi. Bugünkü planlama için ilgili.",
                status: "Bugün bak",
              },
              {
                type: "link",
                title: "Retention analizi",
                desc: "AI etiketi: article, growth, activation",
                status: "İşleniyor",
              },
              {
                type: "not",
                title: "Lansman yazıları",
                desc: "Grup: Lansman. 12 kayıt birlikte duruyor.",
                status: "Sonra",
              },
              {
                type: "link",
                title: "Fiyatlandırma fikri",
                desc: "AI özeti hazır. Pro sayfası için kullanılabilir.",
                status: "Bitti",
              },
            ].map((item, index) => (
              <div
                key={item.title}
                className={`rounded-xl border border-white/9 bg-white/[0.04] p-3 sm:p-4 ${
                  index > 1 ? "hidden sm:block" : ""
                }`}
              >
                <div className="mb-4 flex items-center justify-between sm:mb-7">
                  <span className="rounded-md bg-white/[0.06] px-2 py-1 text-xs text-white/44">
                    {item.type}
                  </span>
                  <span className="text-xs text-cyan-100">{item.status}</span>
                </div>
                <h4 className="text-sm font-medium tracking-[-0.02em] text-white sm:text-base">
                  {item.title}
                </h4>
                <p className="mt-3 text-xs leading-5 text-white/46">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-2 sm:mt-5 sm:grid-cols-3 sm:gap-3">
            {["Lansman", "Araştırma", "Kişisel OS"].map((group) => (
              <div
                key={group}
                className="rounded-xl border border-white/9 bg-gradient-to-br from-white/[0.065] to-white/[0.025] p-3 sm:p-4"
              >
                <p className="text-sm font-medium">{group}</p>
                <p className="mt-1 text-xs leading-5 text-white/42 sm:mt-2">
                  12 kayıt gruplandı
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExtensionFlow({
  active,
  activeShot,
  setActiveShot,
  shots,
}: {
  active: Shot;
  activeShot: ShotKey;
  setActiveShot: (shot: ShotKey) => void;
  shots: Shot[];
}) {
  return (
    <section id="extension" className="px-5 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl"
          >
            <p className="text-sm font-medium text-cyan-100/76">Eklenti akışı</p>
            <h2 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
              Sağ tıkla. Kaydet. Devam et.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/56">
              ClarioNot çalışma şeklini bölmeden yakalar: web sayfası, seçili
              metin, link ve bağlam tek akışta çalışma alanına düşer.
            </p>
          </motion.div>
          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/82 backdrop-blur-xl transition hover:bg-white/[0.08] hover:text-white"
          >
            Eklentiyi kur
          </a>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.45fr_0.55fr]">
          <div className="grid gap-3">
            {shots.map((shot, index) => {
              const isActive = shot.key === activeShot;
              return (
                <motion.button
                  key={shot.key}
                  initial={{ opacity: 0, x: -18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.06, duration: 0.55 }}
                  onClick={() => setActiveShot(shot.key)}
                  className={`rounded-xl border p-5 text-left transition ${
                    isActive
                      ? "border-cyan-200/24 bg-cyan-200/10 shadow-2xl shadow-cyan-500/10"
                      : "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/42">{shot.kpi}</span>
                    <span className="rounded-md bg-white/[0.06] px-2 py-1 text-xs text-white/58">
                      {shot.badge}
                    </span>
                  </div>
                  <div className="mt-4 text-lg font-semibold tracking-[-0.02em]">
                    {shot.title}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-white/52">
                    {shot.desc}
                  </div>
                </motion.button>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-2 shadow-2xl shadow-black/40"
          >
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 text-sm text-white/42">
              <span>{active.kpi}</span>
              <span className="font-medium text-white/80">{active.title}</span>
              <span>{active.badge}</span>
            </div>
            <div className="group relative aspect-[16/9] w-full overflow-hidden rounded-lg">
              <Image
                key={active.src}
                src={active.src}
                alt={active.title}
                fill
                className="object-cover object-top transition duration-700 group-hover:scale-[1.03]"
                sizes="(max-width: 1024px) 100vw, 760px"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function PricingSection({
  checkedPlan,
  goDashboard,
  goLogin,
  isAuthed,
  isProUser,
  proPriceFormatted,
  proPriceLoading,
  startProCheckout,
}: {
  checkedPlan: boolean;
  goDashboard: () => void;
  goLogin: () => void;
  isAuthed: boolean;
  isProUser: boolean;
  proPriceFormatted?: string;
  proPriceLoading: boolean;
  startProCheckout: () => void;
}) {
  return (
    <section id="pricing" className="px-5 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 max-w-3xl"
        >
          <p className="text-sm font-medium text-cyan-100/76">Planlar</p>
          <h2 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
            Basit başla. Eklentiyle hızlan.
          </h2>
        </motion.div>

        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.035]">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-white/[0.04] text-white">
              <tr>
                <th className="px-5 py-5 font-semibold">Avantajlar</th>
                <th className="px-5 py-5 font-semibold">Free</th>
                <th className="px-5 py-5 font-semibold">Pro</th>
              </tr>
            </thead>
            <tbody>
              {benefitRows.map(([label, free, pro]) => (
                <tr key={label} className="border-t border-white/8">
                  <td className="px-5 py-4 text-white/78">{label}</td>
                  <td className="px-5 py-4 text-white/48">{free}</td>
                  <td className="px-5 py-4 text-cyan-100">{pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <button
            onClick={() => (isAuthed ? goDashboard() : goLogin())}
            className="rounded-xl border border-white/10 bg-white/[0.035] p-7 text-left transition hover:bg-white/[0.06]"
          >
            <div className="text-sm font-semibold text-white/64">Free</div>
            <div className="mt-3 text-4xl font-semibold tracking-[-0.04em]">₺0</div>
            <p className="mt-4 text-sm leading-6 text-white/54">
              Notları ve linkleri çalışma alanından manuel kaydet.
            </p>
            <div className="mt-8 rounded-lg border border-white/10 bg-white/[0.045] px-5 py-3 text-center text-sm font-semibold">
              Çalışma alanına git
            </div>
          </button>

          <div className="rounded-xl border border-cyan-200/18 bg-cyan-200/[0.055] p-7">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white/70">Pro</div>
              <span className="rounded-md bg-cyan-200/10 px-2 py-1 text-xs text-cyan-50">
                Önerilen
              </span>
            </div>
            <div className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-cyan-50">
              {proPriceLoading
                ? "Yükleniyor..."
                : proPriceFormatted
                  ? proPriceFormatted
                  : "Fiyat alınamadı"}
            </div>
            <p className="mt-4 text-sm leading-6 text-white/58">
              Seçimleri ve linkleri sağ tıkla kaydet. Otomatik başlık,
              sınırsız kayıt ve öncelikli geliştirmeler.
            </p>

            {isProUser ? (
              <button
                onClick={goDashboard}
                className="mt-8 w-full rounded-lg border border-white/10 bg-white/[0.045] px-5 py-3 text-center text-sm font-semibold transition hover:bg-white/[0.07]"
              >
                Pro hesabındasın ✓
              </button>
            ) : (
              <button
                onClick={startProCheckout}
                disabled={!checkedPlan}
                className="accent-gradient mt-8 w-full rounded-lg px-5 py-3 text-center text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Pro’ya yükselt
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCta({ primaryCTA }: { primaryCTA: ReactNode }) {
  return (
    <section className="px-5 py-28 sm:px-8 lg:py-36">
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-15%" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-5xl rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025))] px-6 py-16 text-center shadow-[0_70px_180px_rgba(0,0,0,0.58)] backdrop-blur-2xl sm:px-12"
      >
        <p className="text-sm font-medium text-cyan-100/76">Akışı koru</p>
        <h2 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
          Kaydettiğin her fikre geri dönmenin yolunu ver.
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/58">
          Bir notla, bir linkle ya da kaybolmasını istemediğin tek cümleyle
          başla. ClarioNot onu tekrar işe yarayacak kadar yakında tutar.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          {primaryCTA}
          <Link
            href="/pro"
            className="inline-flex items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white/78 transition hover:bg-white/[0.08] hover:text-white"
          >
            Pro’yu incele
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-black/30 px-5 py-12 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-sm font-black">
            c
          </span>
          <span className="text-sm font-semibold tracking-[0.22em] text-white/78">
            clarionot
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-xs uppercase tracking-[0.22em] text-white/38">
          <a href="#story" className="transition hover:text-white/72">
            Hatırlatma
          </a>
          <a href="#extension" className="transition hover:text-white/72">
            Eklenti
          </a>
          <Link href="/privacy" className="transition hover:text-white/72">
            Gizlilik
          </Link>
          <Link href="/terms" className="transition hover:text-white/72">
            Şartlar
          </Link>
          <Link href="/refund" className="transition hover:text-white/72">
            İade
          </Link>
          <Link href="/support" className="transition hover:text-white/72">
            Destek
          </Link>
          <a href="#pricing" className="transition hover:text-white/72">
            Fiyatlandırma
          </a>
        </div>
        <p className="text-xs text-white/32">
          © {new Date().getFullYear()} ClarioNot
        </p>
      </div>
    </footer>
  );
}
