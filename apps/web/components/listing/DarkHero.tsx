'use client';

import Link from 'next/link';

const C = {
  bg: 'hsl(0,0%,10%)',
  heroBg: 'hsl(0,0%,8%)',
  fg: 'hsl(0,0%,96%)',
  muted: 'hsl(0,0%,60%)',
  primary: 'hsl(244,74%,57%)',
  primaryFg: 'hsl(0,0%,100%)',
};

export function DarkHero() {
  return (
    <section
      style={{ background: C.heroBg }}
      className="relative min-h-screen flex items-end overflow-hidden"
    >
      <style>{`@keyframes fadeUp { 0% { opacity: 0; transform: translateY(20px); filter: blur(4px); } 100% { opacity: 1; transform: translateY(0); filter: blur(0); } }`}</style>

      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full"
        style={{ background: 'hsla(244,74%,57%,0.05)', filter: 'blur(120px)' }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full"
        style={{ background: 'hsla(244,74%,57%,0.05)', filter: 'blur(100px)' }}
      />
      <div className="absolute inset-0 bg-black/30 z-[1] pointer-events-none" />

      <div className="relative z-10 pointer-events-none w-full max-w-[90%] sm:max-w-md lg:max-w-2xl px-6 md:px-10 pb-10 md:pb-10 pt-32">
        <h1
          className="opacity-0"
          style={{
            animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s forwards',
          }}
        >
          <span
            style={{ color: C.fg, fontSize: 'clamp(3rem,8vw,6rem)' }}
            className="font-bold leading-[1.05] tracking-[-0.05em] uppercase"
          >
            Vende, Subasta
          </span>
          <br />
          <span
            style={{ color: C.fg, fontSize: 'clamp(3rem,8vw,6rem)' }}
            className="font-bold leading-[1.05] tracking-[-0.05em] uppercase"
          >
            Intercambia
          </span>
          <br />
          <span
            style={{ color: C.primary, fontSize: 'clamp(3rem,8vw,6rem)' }}
            className="font-bold leading-[1.05] tracking-[-0.05em] uppercase"
          >
            Sin Comision
          </span>
        </h1>

        <p
          style={{
            color: 'hsla(0,0%,96%,0.8)',
            fontSize: 'clamp(1.125rem,2.5vw,1.875rem)',
            animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.4s forwards',
          }}
          className="font-light mb-3 md:mb-6 opacity-0"
        >
          El marketplace argentino que te cuida.
        </p>

        <p
          style={{
            color: C.muted,
            fontSize: 'clamp(0.875rem,1.5vw,1.25rem)',
            animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.55s forwards',
          }}
          className="font-light mb-4 md:mb-8 opacity-0 max-w-xl"
        >
          Publica tu producto en segundos. Vende con o sin stock, subasta al
          mejor postor, o intercambia sin comisiones. Con verificacion de
          identidad y pagos protegidos.
        </p>

        <div
          className="flex flex-wrap gap-3 font-bold opacity-0"
          style={{
            animation:
              'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.7s forwards',
          }}
        >
          <Link
            href="/register"
            style={{ background: C.primary, color: C.primaryFg }}
            className="pointer-events-auto px-6 py-3 md:px-8 md:py-4 text-sm rounded-sm hover:brightness-110 transition-all active:scale-[0.97]"
          >
            Publica gratis
          </Link>
          <Link
            href="/listings"
            style={{ background: '#fff', color: C.heroBg }}
            className="pointer-events-auto px-6 py-3 md:px-8 md:py-4 text-sm rounded-sm hover:brightness-90 transition-all active:scale-[0.97]"
          >
            Explorar
          </Link>
        </div>

        <p
          style={{
            color: 'hsla(0,0%,60%,0.6)',
            animation:
              'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.85s forwards',
          }}
          className="text-xs font-light mt-4 md:mt-6 opacity-0"
        >
          Sin comisiones ocultas. Verificados. +1000 publicaciones activas.
        </p>
      </div>
    </section>
  );
}
