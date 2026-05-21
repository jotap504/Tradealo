'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

const SLIDE_INTERVAL = 20_000;

interface BannerDef {
  id: number;
  badge: string;
  badgeBg: string;
  title: string;
  subtitle: string;
  highlight: string;
  highlightCls: string;
  cta: string;
  href: string;
  gradient: string;
  orb1: string;
  orb2: string;
  emoji1: string;
  emoji2: string;
  label: string;
}

const BANNERS: BannerDef[] = [
  {
    id: 0,
    badge: '🔥 REMATE HOY',
    badgeBg: 'bg-red-500',
    title: 'Electrónica al mejor precio',
    subtitle: 'Celulares, notebooks, tablets y accesorios con precios que no vas a encontrar en otro lado.',
    highlight: 'Hasta 40% OFF',
    highlightCls: 'bg-yellow-400/15 text-yellow-300 border border-yellow-400/40 shadow-[0_0_12px_rgba(250,204,21,0.25)]',
    cta: 'Ver remates',
    href: '/listings?saleType=auction',
    gradient: 'from-[#050d1f] via-[#0d2044] to-[#050d1f]',
    orb1: '#3b82f6',
    orb2: '#6366f1',
    emoji1: '⚡',
    emoji2: '💻',
    label: '01',
  },
  {
    id: 1,
    badge: '⚡ OFERTA DEL DÍA',
    badgeBg: 'bg-amber-500',
    title: 'Deportes y fitness',
    subtitle: 'Equipamiento profesional para tu entrenamiento: zapatillas, pesas, bicicletas y mucho más.',
    highlight: 'Los mejores precios',
    highlightCls: 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/40 shadow-[0_0_12px_rgba(52,211,153,0.25)]',
    cta: 'Explorar productos',
    href: '/listings?category=deportes',
    gradient: 'from-[#021a0d] via-[#063d1a] to-[#021a0d]',
    orb1: '#10b981',
    orb2: '#14b8a6',
    emoji1: '🏆',
    emoji2: '⚽',
    label: '02',
  },
  {
    id: 2,
    badge: '✨ COLECCIÓN EXCLUSIVA',
    badgeBg: 'bg-purple-600',
    title: 'Coleccionables y rarezas',
    subtitle: 'Piezas de colección, antigüedades y artículos de edición limitada que no encontrás en ningún otro lugar.',
    highlight: 'Piezas irrepetibles',
    highlightCls: 'bg-purple-400/15 text-purple-300 border border-purple-400/40 shadow-[0_0_12px_rgba(168,85,247,0.25)]',
    cta: 'Ver colección',
    href: '/listings?isCollectible=true',
    gradient: 'from-[#0f0520] via-[#2d0a5e] to-[#0f0520]',
    orb1: '#a855f7',
    orb2: '#ec4899',
    emoji1: '⭐',
    emoji2: '🎁',
    label: '03',
  },
];

// ─── Framer Motion variants ───────────────────────────────────────────────────
const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: 'spring', stiffness: 280, damping: 32 },
      opacity: { duration: 0.25 },
    },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? '-55%' : '55%',
    opacity: 0,
    scale: 0.96,
    transition: {
      x: { type: 'spring', stiffness: 280, damping: 32 },
      opacity: { duration: 0.2 },
    },
  }),
};

const contentVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.18 } },
  exit:   { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
};

const itemVariants = {
  hidden:  { opacity: 0, y: 22, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: 0.18 } },
};

// ─── Circular SVG progress on active dot ─────────────────────────────────────
const R = 9;
const CIRC = 2 * Math.PI * R;

function DotProgress({ active, paused }: { active: number; paused: boolean }) {
  return (
    <svg width="26" height="26" className="-rotate-90" aria-hidden="true">
      <circle cx="13" cy="13" r={R} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
      <motion.circle
        key={`${active}-${paused}`}
        cx="13" cy="13" r={R}
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={CIRC}
        initial={{ strokeDashoffset: CIRC }}
        animate={paused ? {} : { strokeDashoffset: 0 }}
        transition={{ duration: SLIDE_INTERVAL / 1000, ease: 'linear' }}
      />
    </svg>
  );
}

// ─── Animated orb ─────────────────────────────────────────────────────────────
function Orb({
  color, size, style, delay = 0,
}: {
  color: string; size: number; style: React.CSSProperties; delay?: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size, height: size,
        background: color,
        filter: `blur(${Math.round(size * 0.17)}px)`,
        ...style,
      }}
      animate={{ y: [0, -22, 0], x: [0, 14, 0], scale: [1, 1.09, 1] }}
      transition={{ duration: 8 + delay * 2, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

// ─── Static particle field (deterministic, no random at render) ───────────────
const PARTICLES = [
  { id: 0,  top: '12%', left: '52%', s: 1.5, d: 4.0, dl: 0.0 },
  { id: 1,  top: '23%', left: '61%', s: 2.3, d: 5.5, dl: 0.4 },
  { id: 2,  top: '35%', left: '55%', s: 1.8, d: 4.8, dl: 0.8 },
  { id: 3,  top: '48%', left: '70%', s: 2.0, d: 6.0, dl: 1.2 },
  { id: 4,  top: '60%', left: '58%', s: 1.5, d: 5.2, dl: 1.6 },
  { id: 5,  top: '72%', left: '65%', s: 2.2, d: 4.4, dl: 2.0 },
  { id: 6,  top: '15%', left: '75%', s: 1.6, d: 7.0, dl: 0.2 },
  { id: 7,  top: '28%', left: '82%', s: 2.4, d: 5.0, dl: 0.6 },
  { id: 8,  top: '42%', left: '88%', s: 1.5, d: 4.6, dl: 1.0 },
  { id: 9,  top: '55%', left: '78%', s: 2.0, d: 6.5, dl: 1.4 },
  { id: 10, top: '67%', left: '85%', s: 1.7, d: 5.8, dl: 1.8 },
  { id: 11, top: '80%', left: '72%', s: 2.2, d: 4.2, dl: 2.2 },
  { id: 12, top: '18%', left: '93%', s: 1.6, d: 6.2, dl: 0.3 },
  { id: 13, top: '33%', left: '97%', s: 2.0, d: 4.9, dl: 0.7 },
  { id: 14, top: '50%', left: '95%', s: 1.5, d: 5.6, dl: 1.1 },
  { id: 15, top: '65%', left: '91%', s: 2.3, d: 7.2, dl: 1.5 },
  { id: 16, top: '78%', left: '60%', s: 1.8, d: 4.3, dl: 1.9 },
  { id: 17, top: '88%', left: '80%', s: 2.1, d: 5.9, dl: 2.3 },
];

function ParticleField() {
  return (
    <>
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/25 pointer-events-none"
          style={{ top: p.top, left: p.left, width: p.s, height: p.s }}
          animate={{ opacity: [0.1, 0.55, 0.1], y: [0, -9, 0] }}
          transition={{ duration: p.d, repeat: Infinity, delay: p.dl, ease: 'easeInOut' }}
        />
      ))}
    </>
  );
}

// ─── Main slider ──────────────────────────────────────────────────────────────
export function PromoBannerSlider() {
  const [active, setActive]     = useState(0);
  const [direction, setDir]     = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const total = BANNERS.length;

  const goTo = useCallback((index: number, dir?: number) => {
    const next = ((index % total) + total) % total;
    setDir(dir ?? (next > active ? 1 : -1));
    setActive(next);
  }, [active, total]);

  const next = useCallback(() => goTo(active + 1,  1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1, -1), [active, goTo]);

  useEffect(() => {
    if (isPaused) return;
    const t = setTimeout(next, SLIDE_INTERVAL);
    return () => clearTimeout(t);
  }, [active, isPaused, next]);

  return (
    <section
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Banners promocionales"
    >
      {/* Slide stack */}
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={active}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.07}
          onDragEnd={(_, info) => {
            if (info.offset.x < -50) next();
            else if (info.offset.x > 50) prev();
          }}
          className="w-full cursor-grab active:cursor-grabbing"
        >
          <BannerSlide banner={BANNERS[active]} />
        </motion.div>
      </AnimatePresence>

      {/* ── Arrows ── */}
      <motion.button
        onClick={prev}
        whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.88 }}
        aria-label="Banner anterior"
        className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/30 hover:bg-black/55 text-white flex items-center justify-center backdrop-blur-sm shadow-lg border border-white/10 transition-colors"
      >
        <ChevronLeft size={18} />
      </motion.button>
      <motion.button
        onClick={next}
        whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.88 }}
        aria-label="Banner siguiente"
        className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/30 hover:bg-black/55 text-white flex items-center justify-center backdrop-blur-sm shadow-lg border border-white/10 transition-colors"
      >
        <ChevronRight size={18} />
      </motion.button>

      {/* ── Bottom controls: dots + pause ── */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5">
        {BANNERS.map((b, i) => (
          <button
            key={b.id}
            onClick={() => goTo(i, i > active ? 1 : -1)}
            aria-label={`Ir al banner ${i + 1}`}
            className="flex items-center justify-center"
          >
            {i === active ? (
              <DotProgress active={active} paused={isPaused} />
            ) : (
              <motion.div
                whileHover={{ scale: 1.35 }}
                className="w-2 h-2 rounded-full bg-white/35 hover:bg-white/65 transition-colors"
              />
            )}
          </button>
        ))}

        <motion.button
          onClick={() => setIsPaused((p) => !p)}
          whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
          aria-label={isPaused ? 'Reanudar' : 'Pausar'}
          className="ml-1 w-6 h-6 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center border border-white/20 transition-colors"
        >
          {isPaused ? <Play size={10} /> : <Pause size={10} />}
        </motion.button>
      </div>

      {/* ── Slide counter ── */}
      <div className="absolute top-3.5 right-5 z-20 hidden sm:flex items-center gap-1 text-white/40 text-xs font-mono select-none">
        <span className="text-white/80 font-bold">{String(active + 1).padStart(2, '0')}</span>
        <span className="mx-0.5">/</span>
        <span>{String(total).padStart(2, '0')}</span>
      </div>
    </section>
  );
}

// ─── Individual slide ─────────────────────────────────────────────────────────
function BannerSlide({ banner }: { banner: BannerDef }) {
  return (
    <div
      className={cn(
        'relative w-full h-[220px] sm:h-[310px] lg:h-[390px] overflow-hidden bg-gradient-to-br',
        banner.gradient,
      )}
    >
      {/* Animated orbs */}
      <Orb color={`${banner.orb1}55`} size={420} style={{ top: -180, right: -130 }} delay={0} />
      <Orb color={`${banner.orb2}40`} size={280} style={{ bottom: -100, right: '10%' }} delay={2} />
      <Orb color={`${banner.orb1}30`} size={160} style={{ top: '15%', right: '30%' }} delay={1} />

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.032]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Particles */}
      <ParticleField />

      {/* Decorative ring */}
      <div
        className="absolute rounded-full border pointer-events-none hidden lg:block"
        style={{
          width: 340, height: 340,
          borderColor: `${banner.orb1}25`,
          top: -90, right: '16%',
          boxShadow: `0 0 70px ${banner.orb1}18`,
        }}
      />
      <div
        className="absolute rounded-full border pointer-events-none hidden lg:block"
        style={{
          width: 200, height: 200,
          borderColor: `${banner.orb2}20`,
          top: -20, right: '22%',
        }}
      />

      {/* Large ghost number */}
      <div
        className="absolute right-4 sm:right-10 bottom-0 font-heading font-black text-white/[0.038] leading-none select-none pointer-events-none"
        style={{ fontSize: 'clamp(110px, 20vw, 250px)' }}
        aria-hidden="true"
      >
        {banner.label}
      </div>

      {/* Floating emoji */}
      <motion.div
        className="absolute top-5 right-[9%] text-4xl sm:text-5xl pointer-events-none select-none"
        animate={{ y: [0, -14, 0], rotate: [0, 7, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      >
        {banner.emoji1}
      </motion.div>
      <motion.div
        className="absolute bottom-5 right-[3%] text-6xl sm:text-8xl pointer-events-none select-none opacity-10 hidden sm:block"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        aria-hidden="true"
      >
        {banner.emoji2}
      </motion.div>

      {/* Staggered content */}
      <div className="relative z-10 h-full flex items-center px-5 sm:px-10 lg:px-16">
        <motion.div
          className="max-w-xl"
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.span
            variants={itemVariants}
            className={cn(
              'inline-flex items-center px-3 py-1 rounded-full text-white text-[11px] sm:text-xs font-bold mb-3 shadow-lg tracking-wide',
              banner.badgeBg,
            )}
          >
            {banner.badge}
          </motion.span>

          <motion.h2
            variants={itemVariants}
            className="font-heading text-xl sm:text-[2rem] lg:text-[2.6rem] font-black text-white mb-2 leading-[1.1] tracking-tight"
          >
            {banner.title}
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-xs sm:text-sm text-white/65 mb-3 sm:mb-4 leading-relaxed line-clamp-2 max-w-md"
          >
            {banner.subtitle}
          </motion.p>

          <motion.span
            variants={itemVariants}
            className={cn(
              'inline-flex items-center px-3.5 py-1 rounded-full text-xs sm:text-sm font-semibold mb-4 sm:mb-5',
              banner.highlightCls,
            )}
          >
            {banner.highlight}
          </motion.span>

          <motion.div variants={itemVariants}>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="inline-block">
              <Link
                href={banner.href}
                className="inline-flex items-center gap-2 bg-white text-gray-900 font-bold px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl hover:bg-gray-50 transition-colors shadow-xl text-sm sm:text-base"
              >
                {banner.cta}
                <ArrowRight size={15} />
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
