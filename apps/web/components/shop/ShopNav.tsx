'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useReducedMotion } from 'framer-motion';

interface ShopNavProps {
  shopName: string | null;
  logoUrl: string | null;
  username: string;
}

export default function ShopNav({ shopName, logoUrl, username }: ShopNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const transitionStyle = prefersReduced
    ? {}
    : { transition: 'background-color 0.3s ease, box-shadow 0.3s ease, color 0.3s ease' };

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-4 py-3"
      style={{
        backgroundColor: scrolled ? 'var(--shop-surface)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        boxShadow: scrolled ? '0 1px 16px rgba(0,0,0,0.10)' : 'none',
        ...transitionStyle,
      }}
    >
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <div
            className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0"
            style={{
              border: `2px solid ${scrolled ? 'var(--shop-border)' : 'rgba(255,255,255,0.7)'}`,
              ...transitionStyle,
            }}
          >
            <Image src={logoUrl} alt={shopName ?? 'Logo'} fill className="object-cover" />
          </div>
        ) : null}
        <span
          className="font-bold text-sm truncate max-w-[180px]"
          style={{
            color: scrolled ? 'var(--shop-text)' : '#ffffff',
            textShadow: scrolled ? 'none' : '0 1px 4px rgba(0,0,0,0.4)',
            ...transitionStyle,
          }}
        >
          {shopName ?? username}
        </span>
      </div>

      <Link
        href={`/seller/${username}`}
        className="text-xs font-medium px-3 py-1.5 rounded-full"
        style={{
          color: scrolled ? 'var(--shop-text)' : '#ffffff',
          backgroundColor: scrolled ? 'var(--shop-border)' : 'rgba(255,255,255,0.18)',
          border: `1px solid ${scrolled ? 'var(--shop-border)' : 'rgba(255,255,255,0.35)'}`,
          ...transitionStyle,
        }}
      >
        Trocalia →
      </Link>
    </nav>
  );
}
