"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  type MotionStyle,
  type MotionValue,
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
    sub: "İlgini çeken şeyleri kaydet. ClarioNot ihtiyaç duyduğunda yeniden önüne getirsin.",
  },
];

const staticGlow =
  "0 0 0 1px color-mix(in srgb, var(--clarionot-accent) 38%, transparent), 0 0 40px color-mix(in srgb, var(--clarionot-accent-2) 26%, transparent)";

// Piecewise-linear interpolation against explicit [progress, value] keyframes,
// evaluated fresh from a single progress number every call.
function lerpKeyframes(p: number, points: [number, number][]): number {
  if (p <= points[0][0]) return points[0][1];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    if (p <= x1) return x1 === x0 ? y1 : y0 + ((p - x0) / (x1 - x0)) * (y1 - y0);
  }
  return points[points.length - 1][1];
}

// The text crossfade previously derived each phase's opacity from its own
// useTransform(scrollYProgress, ...) chain. Framer updates those derived
// motion values independently as scroll events arrive, and under this app's
// custom body-scroll container (see AnimatedStage below) some of those
// independent chains could fall behind others, so two adjacent phases'
// opacities stopped matching a single shared progress value and both stayed
// partially visible instead of one cleanly winning — the "Düzenle"/"Kaydet"
// double-exposure. Polling scrollYProgress.get() once per frame and computing
// every phase's opacity from that SAME number in one pass makes that
// impossible: there is exactly one snapshot per frame, so every phase is
// always evaluated against the same progress, never a stale one.
//
// The rAF loop is only allowed to run while `target` (the story's scroll
// wrapper) actually intersects the viewport, via IntersectionObserver — this
// hook is only ever mounted with prefers-reduced-motion off in the first
// place (see CinematicProductStory below, which renders AnimatedStage only
// in that branch), so there's nothing extra to gate for that case, but a
// user scrolled down to Pricing/Footer would otherwise leave this frame
// polling forever for a section that's off-screen and not being rendered
// differently either way.
function useLiveProgress(
  scrollYProgress: MotionValue<number>,
  target: { current: HTMLElement | null },
) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const node = target.current;
    if (!node) return;

    let frame: number | null = null;
    const tick = () => {
      setProgress(scrollYProgress.get());
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (frame === null) frame = requestAnimationFrame(tick);
      } else {
        stop();
      }
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
      stop();
    };
  }, [scrollYProgress, target]);

  return progress;
}

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

// The animated stage's closing beat. It reuses the same left-aligned
// PhaseCopy layout as every other phase (rather than a separately centered
// "final scene") so it can live in the same absolutely-positioned text
// stack and crossfade cleanly instead of compositing against it.
function FinalPhaseCopy({
  primaryCTA,
  chromeStoreUrl,
}: {
  primaryCTA: ReactNode;
  chromeStoreUrl: string;
}) {
  return (
    <>
      <PhaseCopy phase={STORY_PHASES[5]} />
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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

  // --- text crossfade. All six phases are computed from ONE polled
  // progress number (see useLiveProgress above) rather than six independent
  // motion-value chains, so they can never desync from each other. Each
  // phase has an explicit enter/hold/exit interval and every interval's
  // tail lands exactly on (or before) the next phase's head, so at most two
  // phases overlap and only for a ~2-3% sliver of scroll progress — never
  // three or more at once. The final phase (textFinal) is part of this same
  // sequence (not a separately-fading overlay), so it can't double-expose
  // against the story the way a competing opacity ramp on a separate
  // overlay could. ---
  const liveProgress = useLiveProgress(scrollYProgress, sectionRef);
  const textCapture = lerpKeyframes(liveProgress, [
    [0, 1],
    [0.1, 1],
    [0.13, 0],
  ]);
  const textClip = lerpKeyframes(liveProgress, [
    [0.11, 0],
    [0.14, 1],
    [0.27, 1],
    [0.3, 0],
  ]);
  const textOrganize = lerpKeyframes(liveProgress, [
    [0.28, 0],
    [0.31, 1],
    [0.45, 1],
    [0.48, 0],
  ]);
  const textForget = lerpKeyframes(liveProgress, [
    [0.46, 0],
    [0.49, 1],
    [0.63, 1],
    [0.66, 0],
  ]);
  const textRemember = lerpKeyframes(liveProgress, [
    [0.64, 0],
    [0.67, 1],
    [0.83, 1],
    [0.86, 0],
  ]);
  const textFinal = lerpKeyframes(liveProgress, [
    [0.85, 0],
    [0.9, 1],
    [1, 1],
  ]);
  // The final layer sits absolutely-positioned in the same stack as every
  // other phase; without this it would stay hit-testable (its buttons
  // clickable) even while fully transparent and scrolled out of view.
  const finalPointerEvents: "auto" | "none" = textFinal > 0.5 ? "auto" : "none";

  // --- browser scene (phases A/B). Also driven off liveProgress: this used
  // to run on its own useTransform chain, which is what let it stay stuck
  // showing the browser mockup well into "Unut" instead of handing off to
  // the dashboard — the same independent-chain desync as the text bug
  // above, just on the scene side instead of the copy side. ---
  const browserOpacity = lerpKeyframes(liveProgress, [
    [0, 0],
    [0.03, 1],
    [0.26, 1],
    [0.3, 0],
  ]);
  const browserScale = lerpKeyframes(liveProgress, [
    [0, 0.97],
    [0.05, 1],
  ]);

  // --- dashboard scene (phase C onward). It fades in once as the browser
  // scene hands off and then simply stays — it IS the final product
  // composition, just settled, rather than a second scene that has to be
  // swapped out for a separate "final" mockup. ---
  const dashboardOpacity = lerpKeyframes(liveProgress, [
    [0.26, 0],
    [0.3, 1],
  ]);

  // --- the single item that travels through the story: settles into the
  // dashboard once (matching the browser -> dashboard handoff), dims
  // during "forget", brightens during "remember", then fades out by 0.86
  // as it hands off to the highlighted row inside the dashboard itself —
  // it never lingers frozen into the final composition. ---
  const itemOpacity = lerpKeyframes(liveProgress, [
    [0.28, 0],
    [0.33, 1],
    [0.48, 1],
    [0.66, 0.5],
    [0.7, 1],
    [0.83, 1],
    [0.86, 0],
  ]);
  const itemX = lerpKeyframes(liveProgress, [
    [0.26, -70],
    [0.33, 0],
  ]);
  const itemY = lerpKeyframes(liveProgress, [
    [0.26, -90],
    [0.33, 0],
  ]);
  const itemRotate = lerpKeyframes(liveProgress, [
    [0.26, -5],
    [0.33, 0],
  ]);
  const itemScale = lerpKeyframes(liveProgress, [
    [0.26, 0.72],
    [0.33, 1],
    [0.66, 0.94],
    [0.7, 1],
  ]);

  // Phase E ("Unutulanlar" resurfacing) gets the story's one deliberate
  // highlight — a restrained mint/teal glow, not a cyberpunk wash. It
  // ramps in during "remember" and then holds all the way through the
  // final phase, so the handoff from the floating card (which fades out
  // at 0.86) to the highlighted dashboard row (which keeps the same glow)
  // reads as one continuous beat instead of two competing effects.
  const glowPct1 = lerpKeyframes(liveProgress, [
    [0.66, 0],
    [0.8, 38],
    [1, 38],
  ]);
  const glowPct2 = lerpKeyframes(liveProgress, [
    [0.66, 0],
    [0.8, 26],
    [1, 26],
  ]);
  const glowShadow = `0 0 0 1px color-mix(in srgb, var(--clarionot-accent) ${glowPct1}%, transparent), 0 0 40px color-mix(in srgb, var(--clarionot-accent-2) ${glowPct2}%, transparent)`;

  return (
    <div
      ref={sectionRef}
      className="relative h-[260vh] sm:h-[300vh] lg:h-[340vh]"
    >
      <div className="story-stage-height sticky top-0 flex items-center overflow-hidden px-5 sm:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div className="relative min-h-[200px] sm:min-h-[220px] lg:min-h-[300px]">
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
            <motion.div
              style={{ opacity: textFinal, pointerEvents: finalPointerEvents }}
              className="absolute inset-0"
            >
              <FinalPhaseCopy primaryCTA={primaryCTA} chromeStoreUrl={chromeStoreUrl} />
            </motion.div>
          </div>

          <div className="relative mx-auto h-[380px] w-full max-w-md sm:h-[420px]">
            <BrowserScene
              style={{ opacity: browserOpacity, scale: browserScale }}
            />
            <AbstractDashboardScene
              style={{ opacity: dashboardOpacity }}
              highlightStyle={{ boxShadow: glowShadow }}
            />
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
        </div>
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

function AbstractDashboardScene({
  style,
  highlightStyle,
}: {
  style: MotionStyle;
  highlightStyle: MotionStyle;
}) {
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
            Unutulanlar
          </span>
        </div>
        <div className="space-y-2.5 p-4">
          <div className="rounded-lg border border-white/8 bg-white/[0.035] p-3">
            <p className="text-xs font-medium text-white/72">Claude Code notları</p>
            <p className="mt-1 text-[11px] text-white/38">docs.clarionot.com</p>
          </div>
          <motion.div
            style={highlightStyle}
            className="rounded-lg border border-white/10 bg-gradient-to-br from-cyan-300/14 to-white/[0.035] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-white/85">Retention analizi</p>
              <span className="shrink-0 rounded-md bg-cyan-300/12 px-1.5 py-0.5 text-[10px] text-cyan-100">
                Geri döndü
              </span>
            </div>
            <p className="mt-1 text-[11px] text-white/42">makale.com</p>
          </motion.div>
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
