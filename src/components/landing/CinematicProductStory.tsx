"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionStyle,
} from "framer-motion";

type StoryPhase = {
  id: "capture" | "clip" | "organize" | "forget" | "remember" | "continue";
  eyebrow: string;
  headline: string;
  sub?: string;
};

// Single source of truth for copy — both the scroll-scrubbed stage and the
// prefers-reduced-motion fallback render from this list, so the two trees
// can never drift out of sync with each other.
const STORY_PHASES: StoryPhase[] = [
  {
    id: "capture",
    eyebrow: "Yakala",
    headline: "Gördüğünü kaybetme.",
    sub: "İlgini çeken linkleri ve notları tek hareketle ClarioNot'a kaydet.",
  },
  {
    id: "clip",
    eyebrow: "Kaydet",
    headline: "Tek tıkla yakala.",
  },
  {
    id: "organize",
    eyebrow: "Düzenle",
    headline: "Her şey yerli yerinde.",
    sub: "Notlarını, bağlantılarını ve gruplarını tek yerde tut.",
  },
  {
    id: "forget",
    eyebrow: "Unut",
    headline: "Sonra hayat devam eder.",
    sub: "Kaydettiğin şeylerin hepsini her gün hatırlamak zorunda değilsin.",
  },
  {
    id: "remember",
    eyebrow: "Hatırla",
    headline: "ClarioNot hatırlar.",
    sub: "Uzun süredir bakmadığın önemli şeyleri yeniden keşfet.",
  },
  {
    id: "continue",
    eyebrow: "Devam et",
    headline: "Kaydet. Unut. ClarioNot hatırlatsın.",
  },
];

const staticGlow =
  "0 0 0 1px color-mix(in srgb, var(--clarionot-accent) 38%, transparent), 0 0 40px color-mix(in srgb, var(--clarionot-accent-2) 26%, transparent)";

export default function CinematicProductStory({
  primaryCTA,
  chromeStoreUrl,
}: {
  primaryCTA: ReactNode;
  chromeStoreUrl: string;
}) {
  // The whole point of this section is scroll-scrubbed motion, so under
  // prefers-reduced-motion it renders a genuinely different, non-pinned
  // tree rather than just swapping styles within the same one.
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id="story" className="relative">
      {prefersReducedMotion ? (
        <ReducedStoryFallback primaryCTA={primaryCTA} chromeStoreUrl={chromeStoreUrl} />
      ) : (
        <AnimatedStage primaryCTA={primaryCTA} chromeStoreUrl={chromeStoreUrl} />
      )}
    </section>
  );
}

function PhaseCopy({ phase }: { phase: StoryPhase }) {
  return (
    <>
      <p className="text-sm font-medium text-cyan-200/80">{phase.eyebrow}</p>
      <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
        {phase.headline}
      </h2>
      {phase.sub ? (
        <p className="mt-5 max-w-md text-base leading-7 text-white/58 sm:text-lg sm:leading-8">
          {phase.sub}
        </p>
      ) : null}
    </>
  );
}

function AnimatedStage({
  primaryCTA,
  chromeStoreUrl,
}: {
  primaryCTA: ReactNode;
  chromeStoreUrl: string;
}) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  // This app's global CSS (html/body height:100% + overflow-x:hidden on
  // both) makes <body>, not the window, the element that actually scrolls.
  // Pin the scroll container explicitly so scroll-linked motion values
  // track the real scroll instead of a listener that never fires.
  const scrollContainerRef = useRef<HTMLElement | null>(
    typeof document !== "undefined" ? document.body : null,
  );
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    container: scrollContainerRef,
    offset: ["start start", "end end"],
  });

  // --- text crossfade, one motion value per phase (phase F is handled by
  // FinalScene separately, since it's a different compositional beat) ---
  const textCapture = useTransform(scrollYProgress, [0, 0.12, 0.15], [1, 1, 0]);
  const textClip = useTransform(
    scrollYProgress,
    [0.13, 0.17, 0.32, 0.35],
    [0, 1, 1, 0],
  );
  const textOrganize = useTransform(
    scrollYProgress,
    [0.33, 0.37, 0.52, 0.55],
    [0, 1, 1, 0],
  );
  const textForget = useTransform(
    scrollYProgress,
    [0.53, 0.57, 0.72, 0.75],
    [0, 1, 1, 0],
  );
  const textRemember = useTransform(scrollYProgress, [0.73, 0.77, 0.9], [0, 1, 1]);

  // --- browser scene (phases A/B) ---
  const browserOpacity = useTransform(
    scrollYProgress,
    [0, 0.03, 0.38, 0.44],
    [0, 1, 1, 0],
  );
  const browserScale = useTransform(scrollYProgress, [0, 0.05], [0.97, 1]);

  // --- abstract dashboard scene (phases C/D/E) ---
  const dashboardOpacity = useTransform(
    scrollYProgress,
    [0.36, 0.42, 0.9, 0.95],
    [0, 1, 1, 0],
  );

  // --- the single item that travels through the whole story. Position
  // only moves once (B -> C, landing at its resting slot); everything
  // after that is opacity/scale/glow so beats never fight over transform
  // ownership. ---
  const itemOpacity = useTransform(
    scrollYProgress,
    [0.15, 0.2, 0.35, 0.55, 0.62, 0.75, 0.8, 0.9],
    [0, 1, 1, 1, 0.55, 0.55, 1, 1],
  );
  const itemX = useTransform(scrollYProgress, [0.15, 0.35], [-70, 0]);
  const itemY = useTransform(scrollYProgress, [0.15, 0.35], [-90, 0]);
  const itemRotate = useTransform(scrollYProgress, [0.15, 0.35], [-5, 0]);
  const itemScale = useTransform(
    scrollYProgress,
    [0.15, 0.35, 0.55, 0.75],
    [0.72, 1, 0.94, 1],
  );

  // Phase E ("Unutulanlar" resurfacing) gets the story's one deliberate
  // highlight — a restrained mint/teal glow, not a cyberpunk wash.
  const glowPct1 = useTransform(scrollYProgress, [0.75, 0.85, 0.9], [0, 38, 38]);
  const glowPct2 = useTransform(scrollYProgress, [0.75, 0.85, 0.9], [0, 26, 26]);
  const glowShadow = useMotionTemplate`0 0 0 1px color-mix(in srgb, var(--clarionot-accent) ${glowPct1}%, transparent), 0 0 40px color-mix(in srgb, var(--clarionot-accent-2) ${glowPct2}%, transparent)`;

  // --- the two-column "in progress" composition fades out as the final
  // scene fades in on top of it. ---
  const storyOpacity = useTransform(scrollYProgress, [0.9, 0.95], [1, 0]);
  const finalOpacity = useTransform(scrollYProgress, [0.9, 0.96], [0, 1]);
  const finalScale = useTransform(scrollYProgress, [0.9, 0.97], [0.97, 1]);

  return (
    <div
      ref={sectionRef}
      className="relative h-[260vh] sm:h-[300vh] lg:h-[340vh]"
    >
      <div className="story-stage-height sticky top-0 flex items-center overflow-hidden px-5 sm:px-8">
        <motion.div
          style={{ opacity: storyOpacity }}
          className="mx-auto grid w-full max-w-7xl gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-center"
        >
          <div className="relative min-h-[200px] sm:min-h-[220px] lg:min-h-[260px]">
            <motion.div style={{ opacity: textCapture }} className="absolute inset-0">
              <PhaseCopy phase={STORY_PHASES[0]} />
            </motion.div>
            <motion.div style={{ opacity: textClip }} className="absolute inset-0">
              <PhaseCopy phase={STORY_PHASES[1]} />
            </motion.div>
            <motion.div style={{ opacity: textOrganize }} className="absolute inset-0">
              <PhaseCopy phase={STORY_PHASES[2]} />
            </motion.div>
            <motion.div style={{ opacity: textForget }} className="absolute inset-0">
              <PhaseCopy phase={STORY_PHASES[3]} />
            </motion.div>
            <motion.div style={{ opacity: textRemember }} className="absolute inset-0">
              <PhaseCopy phase={STORY_PHASES[4]} />
            </motion.div>
          </div>

          <div className="relative mx-auto h-[380px] w-full max-w-md sm:h-[420px]">
            <BrowserScene
              style={{ opacity: browserOpacity, scale: browserScale }}
            />
            <AbstractDashboardScene style={{ opacity: dashboardOpacity }} />
            <FloatingItemCard
              style={{
                opacity: itemOpacity,
                x: itemX,
                y: itemY,
                rotate: itemRotate,
                scale: itemScale,
                boxShadow: glowShadow,
              }}
            />
          </div>
        </motion.div>

        <motion.div
          style={{ opacity: finalOpacity, scale: finalScale }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center px-5 sm:px-8"
        >
          <div className="pointer-events-auto">
            <FinalScene primaryCTA={primaryCTA} chromeStoreUrl={chromeStoreUrl} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function BrowserScene({ style }: { style: MotionStyle }) {
  return (
    <motion.div
      style={style}
      className="absolute inset-0 flex items-center justify-center"
    >
      <div className="relative w-full max-w-sm overflow-visible rounded-xl border border-white/10 bg-[#06080c]/95 shadow-[0_40px_140px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between gap-3 border-b border-white/8 bg-white/[0.035] px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-300/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-200/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/70" />
          </div>
          <span className="truncate text-xs text-white/38">makale.com/uzun-yazi</span>
        </div>
        <div className="space-y-3 p-5">
          <div className="h-3 w-2/3 rounded-full bg-white/[0.14]" />
          <div className="h-2 w-[92%] rounded-full bg-white/[0.08]" />
          <div className="h-2 w-[84%] rounded-full bg-white/[0.08]" />
          <div className="h-2 w-[70%] rounded-full bg-white/[0.08]" />
          <div className="mt-4 h-20 rounded-lg border border-white/8 bg-white/[0.03]" />
        </div>
        <div className="theme-chip absolute -right-3 -top-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white/82 backdrop-blur-xl">
          <span className="accent-bg h-1.5 w-1.5 rounded-full" />
          ClarioNot Clip
        </div>
      </div>
    </motion.div>
  );
}

function AbstractDashboardScene({ style }: { style: MotionStyle }) {
  return (
    <motion.div
      style={style}
      className="absolute inset-0 flex items-center justify-center"
    >
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-white/10 bg-[#06080c]/95 shadow-[0_40px_140px_rgba(0,0,0,0.55)]">
        <div className="flex items-center gap-3 border-b border-white/8 bg-white/[0.035] px-4 py-3">
          <span className="theme-chip grid h-7 w-7 place-items-center rounded-md text-xs font-black">
            c
          </span>
          <span className="text-xs font-semibold tracking-[0.18em] text-white/68">
            clarionot
          </span>
        </div>
        <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#030406]">
            Inbox
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/58">
            Araştırma
          </span>
        </div>
        <div className="p-5">
          <div className="h-28 rounded-lg border border-dashed border-white/12 bg-white/[0.02]" />
        </div>
      </div>
    </motion.div>
  );
}

function FloatingItemCard({ style }: { style: MotionStyle }) {
  return (
    <motion.article
      style={style}
      className="pointer-events-none absolute right-8 top-16 w-56 rounded-lg border border-white/10 bg-gradient-to-br from-cyan-300/14 to-white/[0.035] p-3.5 shadow-lg shadow-black/30 backdrop-blur-xl sm:right-12"
    >
      <span className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/55">
        🔗 makale.com
      </span>
      <p className="mt-3 text-sm font-medium text-white/82">Retention analizi</p>
      <span className="mt-2 inline-block rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-white/55">
        #araştırma
      </span>
    </motion.article>
  );
}

function FinalScene({
  primaryCTA,
  chromeStoreUrl,
}: {
  primaryCTA: ReactNode;
  chromeStoreUrl: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="theme-chip theme-accent-glow mx-auto grid h-12 w-12 place-items-center rounded-xl text-lg font-black backdrop-blur-xl">
        c
      </span>
      <h2 className="mt-6 text-balance text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
        {STORY_PHASES[5].headline}
      </h2>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {primaryCTA}
        <a
          href={chromeStoreUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white/82 backdrop-blur-xl transition hover:bg-white/[0.08] hover:text-white"
        >
          ClarioNot Clip&apos;i Ekle
        </a>
      </div>
    </div>
  );
}

function ReducedStoryFallback({
  primaryCTA,
  chromeStoreUrl,
}: {
  primaryCTA: ReactNode;
  chromeStoreUrl: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-28 sm:px-8 lg:py-40">
      <div className="grid gap-16">
        {STORY_PHASES.slice(0, 5).map((phase) => (
          <motion.div
            key={phase.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.5 }}
          >
            <PhaseCopy phase={phase} />
          </motion.div>
        ))}
      </div>

      <div className="mt-20 rounded-xl border border-white/10 bg-white/[0.035] p-8" style={{ boxShadow: staticGlow }}>
        <FinalScene primaryCTA={primaryCTA} chromeStoreUrl={chromeStoreUrl} />
      </div>
    </div>
  );
}
