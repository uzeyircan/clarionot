"use client";

import { useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: "blur(10px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
};

// Cards settle into a plain 2-col CSS grid (their natural, un-animated
// position). Each one starts offset from that spot via transform and eases
// back to zero, so "scattered" and "organized" are the same layout — just a
// transform away from resting.
const SCATTER_FROM = [
  { x: -46, y: -26, rotate: -6 },
  { x: 52, y: 24, rotate: 4 },
  { x: -34, y: 54, rotate: 3 },
  { x: 42, y: -46, rotate: -4 },
] as const;

export default function NoteScrollStory() {
  const sectionRef = useRef<HTMLElement | null>(null);
  // This app's global CSS (html/body height:100% + overflow-x:hidden on
  // both) makes <body>, not the window, the element that actually scrolls —
  // document.body.scrollTop moves while window.scrollY stays put. Pin the
  // scroll container explicitly so scroll-linked motion values track the
  // real scroll instead of a listener that never fires.
  const scrollContainerRef = useRef<HTMLElement | null>(
    typeof document !== "undefined" ? document.body : null,
  );
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    container: scrollContainerRef,
    offset: ["start end", "end start"],
  });

  // With offset ["start end", "end start"], progress 0.5 always lands
  // exactly when the section is vertically centered in the viewport — so
  // every card eases from its scattered offset to its resting grid position
  // across 0 → 0.5, landing crisp and organized right as it centers.
  const x0 = useTransform(scrollYProgress, [0, 0.5], [SCATTER_FROM[0].x, 0]);
  const y0 = useTransform(scrollYProgress, [0, 0.5], [SCATTER_FROM[0].y, 0]);
  const r0 = useTransform(scrollYProgress, [0, 0.5], [SCATTER_FROM[0].rotate, 0]);

  const x1 = useTransform(scrollYProgress, [0, 0.5], [SCATTER_FROM[1].x, 0]);
  const y1 = useTransform(scrollYProgress, [0, 0.5], [SCATTER_FROM[1].y, 0]);
  const r1 = useTransform(scrollYProgress, [0, 0.5], [SCATTER_FROM[1].rotate, 0]);

  const x2 = useTransform(scrollYProgress, [0, 0.5], [SCATTER_FROM[2].x, 0]);
  const y2 = useTransform(scrollYProgress, [0, 0.5], [SCATTER_FROM[2].y, 0]);
  const r2 = useTransform(scrollYProgress, [0, 0.5], [SCATTER_FROM[2].rotate, 0]);

  const x3 = useTransform(scrollYProgress, [0, 0.5], [SCATTER_FROM[3].x, 0]);
  const y3 = useTransform(scrollYProgress, [0, 0.5], [SCATTER_FROM[3].y, 0]);
  const r3 = useTransform(scrollYProgress, [0, 0.5], [SCATTER_FROM[3].rotate, 0]);

  // Cards 2-4 just settle in and stay put — the calm, organized backdrop.
  const settleOpacity = useTransform(scrollYProgress, [0, 0.24, 0.5], [0.4, 0.45, 1]);

  // Card 1 carries the full arc: scattered → saved → organized (crisp right
  // at center, progress 0.5) → forgotten → rediscovered. Its position only
  // settles once (same window as the rest); everything after center is
  // opacity + glow, so stages never fight over x/y.
  const card1Opacity = useTransform(
    scrollYProgress,
    [0, 0.24, 0.5, 0.6, 0.68, 0.76, 0.9, 1],
    [0.4, 0.45, 1, 1, 0.4, 0.4, 1, 1],
  );

  const tagsOpacity = useTransform(scrollYProgress, [0.4, 0.48, 1], [0, 1, 1]);
  const savedOpacity = useTransform(scrollYProgress, [0.26, 0.34, 0.42, 0.48], [0, 1, 1, 0]);
  const forgottenOpacity = useTransform(
    scrollYProgress,
    [0.6, 0.66, 0.72, 0.78],
    [0, 1, 1, 0],
  );
  const rediscoveredOpacity = useTransform(scrollYProgress, [0.78, 0.88, 1], [0, 1, 1]);

  // The "Unutulanlar" return is the most prominent beat in the sequence,
  // so it gets the strongest (still restrained) glow of the whole story.
  const glowPct1 = useTransform(scrollYProgress, [0.78, 0.9, 1], [0, 42, 42]);
  const glowPct2 = useTransform(scrollYProgress, [0.78, 0.9, 1], [0, 28, 28]);
  const glowShadow = useMotionTemplate`0 0 0 1px color-mix(in srgb, var(--clarionot-accent) ${glowPct1}%, transparent), 0 0 42px color-mix(in srgb, var(--clarionot-accent-2) ${glowPct2}%, transparent)`;
  const staticGlow =
    "0 0 0 1px color-mix(in srgb, var(--clarionot-accent) 42%, transparent), 0 0 42px color-mix(in srgb, var(--clarionot-accent-2) 28%, transparent)";

  const card1Style = prefersReducedMotion
    ? { boxShadow: staticGlow }
    : { opacity: card1Opacity, x: x0, y: y0, rotate: r0, boxShadow: glowShadow };
  const card2Style = prefersReducedMotion ? {} : { opacity: settleOpacity, x: x1, y: y1, rotate: r1 };
  const card3Style = prefersReducedMotion ? {} : { opacity: settleOpacity, x: x2, y: y2, rotate: r2 };
  const card4Style = prefersReducedMotion ? {} : { opacity: settleOpacity, x: x3, y: y3, rotate: r3 };
  const tagsStyle = prefersReducedMotion ? { opacity: 1 } : { opacity: tagsOpacity };

  return (
    <section id="story" ref={sectionRef} className="relative px-5 py-28 sm:px-8 lg:py-40">
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
            Arşiv büyür. Uzun süredir açmadığın kayıtlar yeniden görünür olur.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-6 max-w-xl text-lg leading-8 text-white/58">
            Kaydetmek işin sadece yarısı. ClarioNot, uzun süredir açmadığın
            kayıtları Unutulanlar bölümünde yeniden karşına çıkarır.
          </motion.p>
        </motion.div>

        <div
          className="mx-auto grid w-full max-w-[420px] grid-cols-2 gap-3 sm:max-w-[480px] sm:gap-4 lg:mx-0 lg:max-w-[520px]"
          aria-hidden="true"
        >
          <motion.article
            style={card1Style}
            className="pointer-events-none rounded-lg border border-white/10 bg-gradient-to-br from-cyan-300/14 to-white/[0.035] p-3.5 shadow-lg shadow-black/30 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <span className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/55">
                📝 Not
              </span>
            </div>
            <p className="mt-3 text-sm font-medium text-white/78">Ürün geliştirme notu</p>

            <div className="relative mt-3 h-4">
              <motion.span
                style={prefersReducedMotion ? { opacity: 0 } : { opacity: savedOpacity }}
                className="absolute inset-0 text-xs font-medium text-cyan-200/85"
              >
                Kaydedildi
              </motion.span>
              <motion.span
                style={prefersReducedMotion ? { opacity: 0 } : { opacity: forgottenOpacity }}
                className="absolute inset-0 text-xs font-medium text-white/45"
              >
                Uzun süredir açılmadı
              </motion.span>
              <motion.span
                style={prefersReducedMotion ? { opacity: 1 } : { opacity: rediscoveredOpacity }}
                className="theme-chip absolute inset-0 inline-flex w-fit items-center rounded-md px-2 py-0.5 text-[11px] font-medium"
              >
                Unutulanlar
              </motion.span>
            </div>

            <motion.span
              style={tagsStyle}
              className="mt-2 inline-block rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-white/55"
            >
              #ürün
            </motion.span>
          </motion.article>

          <motion.article
            style={card2Style}
            className="pointer-events-none rounded-lg border border-white/10 bg-white/[0.03] p-3.5 shadow-lg shadow-black/30 backdrop-blur-xl"
          >
            <span className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/50">
              🔗 Link
            </span>
            <p className="mt-3 text-sm font-medium text-white/70">Sonra araştır</p>
            <motion.span
              style={tagsStyle}
              className="mt-3 inline-block rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-white/55"
            >
              #araştırma
            </motion.span>
          </motion.article>

          <motion.article
            style={card3Style}
            className="pointer-events-none hidden rounded-lg border border-white/10 bg-white/[0.03] p-3.5 shadow-lg shadow-black/30 backdrop-blur-xl sm:block"
          >
            <span className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/50">
              🔗 Link
            </span>
            <p className="mt-3 text-sm font-medium text-white/70">Okunacak makale</p>
            <motion.span
              style={tagsStyle}
              className="mt-3 inline-block rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-white/55"
            >
              #araştırma
            </motion.span>
          </motion.article>

          <motion.article
            style={card4Style}
            className="pointer-events-none hidden rounded-lg border border-white/10 bg-white/[0.03] p-3.5 shadow-lg shadow-black/30 backdrop-blur-xl lg:block"
          >
            <span className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/50">
              💡 Fikir
            </span>
            <p className="mt-3 text-sm font-medium text-white/70">Tasarım ilhamı</p>
            <motion.span
              style={tagsStyle}
              className="mt-3 inline-block rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-white/55"
            >
              #fikir
            </motion.span>
          </motion.article>
        </div>
      </div>
    </section>
  );
}
