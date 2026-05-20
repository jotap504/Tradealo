'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

const SLIDE_INTERVAL = 20_000; // ms — cambiable sin tocar más código

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
  orb1Color: string;
  orb2Color: string;
  emoji1: string;
  emoji2: string;
  emoji3: string;
}

const BANNERS: BannerDef[] = [
  {
    id: 0,
    badge: '🔥 REMATE HOY',
    badgeBg: 'bg-red-500',
    title: 'Electrónica al mejor precio',
    subtitle: 'Celulares, notebooks, tablets y accesorios tecnológicos con precios que no vas a encontrar en otro lado.',
    highlight: 'Hasta 40% OFF',
    highlightCls: 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30',
    cta: 'Ver remates',
    href: '/listings?saleType=auction',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0f172a 100%)',
    orb1Color: 'rgba(59,130,246,0.28)',
    orb2Color: 'rgba(99,102,241,0.18)',
    emoji1: '⚡',
    emoji2: '💻',
    emoji3: '📱',
  },
  {
    id: 1,
    badge: '⚡ OFERTA DEL DÍA',
    badgeBg: 'bg-amber-500',
    title: 'Deportes y fitness',
    subtitle: 'Equipamiento profesional para tu entrenamiento: zapatillas, pesas, bicicletas y mucho más.',
    highlight: 'Los mejores precios',
    highlightCls: 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30',
    cta: 'Explorar productos',
    href: '/listings?category=deportes',
    gradient: 'linear-gradient(135deg, #052e16 0%, #14532d 40%, #052e16 100%)',
    orb1Color: 'rgba(52,211,153,0.28)',
    orb2Color: 'rgba(20,184,166,0.18)',
    emoji1: '🏆',
    emoji2: '⚽',
    emoji3: '🎽',
  },
  {
    id: 2,
    badge: '✨ COLECCIÓN EXCLUSIVA',
    badgeBg: 'bg-purple-600',
    title: 'Coleccionables y rarezas',
    subtitle: 'Piezas de colección, antigüedades y artículos de edición limitada que no encontrás en ningún otro lugar.',
    highlight: 'Piezas irrepetibles',
    highlightCls: 'bg-purple-400/20 text-purple-300 border border-purple-400/30',
    cta: 'Ver colección',
    href: '/listings?isCollectible=true',
    gradient: 'linear-gradient(135deg, #1a0533 0%, #3b0764 40%, #1a0533 100%)',
    orb1Color: 'rgba(168,85,247,0.28)',
    orb2Color: 'rgba(236,72,153,0.18)',
    emoji1: '⭐',
    emoji2: '🎁',
    emoji3: '🏺',
  },
];

export function PromoBannerSlider() {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const total = BANNERS.length;

  const goTo = useCallback(
    (index: number) => {
      setActive(((index % total) + total) % total);
      setProgressKey((k) => k + 1);
    },
    [total],
  );

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  useEffect(() => {
    if (isPaused) return;
    const t = setTimeout(next, SLIDE_INTERVAL);
    return () => clearTimeout(t);
  }, [active, isPaused, next]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) { if (delta > 0) next(); else prev(); }
    touchStartX.current = null;
  };

  return (
    <section
      className="relative w-full overflow-hidden select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-label="Banners promocionales"
    >
      {/* Slide track */}
      <div
        className="flex transition-transform duration-700 ease-in-out will-change-transform"
        style={{ transform: `translateX(-${active * 100}%)` }}
      >
        {BANNERS.map((banner, index) => (
          <BannerSlide key={banner.id} banner={banner} isActive={index === active} />
        ))}
      </div>

      {/* Prev arrow */}
      <button
        onClick={prev}
        aria-label="Banner anterior"
        className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/30 hover:bg-black/55 text-white flex items-center justify-center backdrop-blur-sm transition-all duration-200 hover:scale-110 shadow-lg"
      >
        <ChevronLeft size={20} />
      </button>

      {/* Next arrow */}
      <button
        onClick={next}
        aria-label="Banner siguiente"
        className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/30 hover:bg-black/55 text-white flex items-center justify-center backdrop-blur-sm transition-all duration-200 hover:scale-110 shadow-lg"
      >
        <ChevronRight size={20} />
      </button>

      {/* Bottom controls: dots + pause */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        <div className="flex items-center gap-2">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Ir al banner ${i + 1}`}
              className={cn(
                'rounded-full transition-all duration-300 shadow-sm',
                i === active
                  ? 'w-7 h-2.5 bg-white'
                  : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/65',
              )}
            />
          ))}
        </div>

        <button
          onClick={() => setIsPaused((p) => !p)}
          aria-label={isPaused ? 'Reanudar' : 'Pausar'}
          className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition-all"
        >
          {isPaused ? <Play size={11} /> : <Pause size={11} />}
        </button>
      </div>

      {/* Progress bar — key changes on slide transition to restart animation */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 z-20">
        <div
          key={`${progressKey}-${isPaused}`}
          className="h-full bg-white/50 origin-left"
          style={{
            animation: isPaused
              ? 'none'
              : `promoProgress ${SLIDE_INTERVAL}ms linear forwards`,
          }}
        />
      </div>
    </section>
  );
}

function BannerSlide({
  banner,
  isActive,
}: {
  banner: BannerDef;
  isActive: boolean;
}) {
  return (
    <div
      className="relative w-full flex-shrink-0 h-[220px] sm:h-[300px] lg:h-[380px] overflow-hidden"
      style={{ background: banner.gradient }}
    >
      {/* Animated orbs */}
      <div
        className="absolute rounded-full blur-3xl pointer-events-none"
        style={{
          width: 420,
          height: 420,
          background: banner.orb1Color,
          top: -160,
          right: -120,
          animation: 'floatOrb 9s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full blur-2xl pointer-events-none"
        style={{
          width: 260,
          height: 260,
          background: banner.orb2Color,
          bottom: -80,
          right: '14%',
          animation: 'floatOrb 12s ease-in-out infinite reverse',
        }}
      />
      <div
        className="absolute rounded-full blur-xl pointer-events-none"
        style={{
          width: 140,
          height: 140,
          background: banner.orb1Color,
          top: '20%',
          right: '32%',
          animation: 'floatOrb 7s ease-in-out infinite',
        }}
      />

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Floating emoji decorations */}
      <div
        className="absolute top-5 right-[10%] text-4xl sm:text-5xl pointer-events-none"
        style={{ animation: 'floatUp 3.5s ease-in-out infinite' }}
        aria-hidden="true"
      >
        {banner.emoji1}
      </div>
      <div
        className="absolute bottom-6 right-[4%] text-6xl sm:text-8xl pointer-events-none opacity-10 hidden sm:block"
        aria-hidden="true"
      >
        {banner.emoji2}
      </div>
      <div
        className="absolute top-1/2 right-[21%] -translate-y-1/2 text-5xl sm:text-6xl pointer-events-none opacity-10 hidden lg:block"
        aria-hidden="true"
      >
        {banner.emoji3}
      </div>

      {/* Main content — slides in when active */}
      <div className="relative z-10 h-full flex items-center px-5 sm:px-10 lg:px-16">
        <div
          className={cn(
            'max-w-xl transition-all duration-700 ease-out',
            isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10',
          )}
        >
          {/* Badge */}
          <span
            className={cn(
              'inline-flex items-center px-3 py-1 rounded-full text-white text-[11px] sm:text-xs font-bold mb-3 shadow-md tracking-wide',
              banner.badgeBg,
            )}
          >
            {banner.badge}
          </span>

          {/* Title */}
          <h2 className="font-heading text-xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 leading-tight">
            {banner.title}
          </h2>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-white/70 mb-3 sm:mb-4 leading-relaxed line-clamp-2 max-w-md">
            {banner.subtitle}
          </p>

          {/* Highlight pill */}
          <span
            className={cn(
              'inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-semibold mb-4 sm:mb-5',
              banner.highlightCls,
            )}
          >
            {banner.highlight}
          </span>

          {/* CTA button */}
          <div>
            <Link
              href={banner.href}
              className="inline-flex items-center gap-2 bg-white text-gray-900 font-bold px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl hover:bg-gray-100 active:scale-95 transition-all duration-200 hover:scale-105 hover:shadow-xl shadow-md text-sm sm:text-base"
            >
              {banner.cta}
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
