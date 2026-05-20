'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { TextScramble } from '@/components/ui/text-scramble';
import { useAuthStore } from '@/lib/store';

// --- Data for the marketplace accordion ---
const CATEGORY_DATA = [
  {
    id: 'electronica',
    title: 'Electrónica',
    slug: 'electronica',
    imageUrl:
      'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?q=80&w=1922&auto=format&fit=crop',
    description: 'Celulares, tablets, notebooks y más',
  },
  {
    id: 'deportes',
    title: 'Deportes',
    slug: 'deportes',
    imageUrl:
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=2070&auto=format&fit=crop',
    description: 'Equipamiento, ropa y accesorios',
  },
  {
    id: 'hogar',
    title: 'Hogar',
    slug: 'hogar',
    imageUrl:
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=2158&auto=format&fit=crop',
    description: 'Muebles, decoración y electrodomésticos',
  },
  {
    id: 'coleccionables',
    title: 'Coleccionables',
    slug: 'coleccionables',
    imageUrl:
      'https://images.unsplash.com/photo-1618172193763-c511deb635ca?q=80&w=1964&auto=format&fit=crop',
    description: 'Figuras, monedas, arte y objetos únicos',
  },
  {
    id: 'indumentaria',
    title: 'Indumentaria',
    slug: 'indumentaria',
    imageUrl:
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=2070&auto=format&fit=crop',
    description: 'Ropa, calzado y accesorios de moda',
  },
];

// --- Accordion Item ---
function AccordionItem({
  item,
  isActive,
  onMouseEnter,
  href,
}: {
  item: (typeof CATEGORY_DATA)[number];
  isActive: boolean;
  onMouseEnter: () => void;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`
        relative h-[420px] md:h-[500px] rounded-2xl overflow-hidden cursor-pointer
        transition-all duration-700 ease-in-out shrink-0
        ${isActive ? 'flex-[3]' : 'flex-[0.7]'}
      `}
      onMouseEnter={onMouseEnter}
    >
      <img
        src={item.imageUrl}
        alt={item.title}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
        <h3
          className={`
            font-heading text-white font-bold
            transition-all duration-300 ease-in-out
            ${
              isActive
                ? 'text-xl md:text-2xl mb-1'
                : 'text-sm md:text-base [writing-mode:vertical-rl] rotate-180 mb-0'
            }
          `}
        >
          {item.title}
        </h3>
        {isActive && (
          <p className="text-white/80 text-xs md:text-sm max-w-[200px] animate-fade-in">
            {item.description}
          </p>
        )}
      </div>
    </Link>
  );
}

// --- Scramble cycling through words ---
function ScrambleWords({
  texts,
  className,
}: {
  texts: string[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [key, setKey] = useState(0);

  const handleComplete = () => {
    setTimeout(() => {
      setIndex((prev) => (prev + 1) % texts.length);
      setKey((prev) => prev + 1);
    }, 2500);
  };

  return (
    <TextScramble
      key={key}
      className={className}
      as="h1"
      trigger={true}
      onScrambleComplete={handleComplete}
      duration={1.5}
      speed={0.03}
    >
      {texts[index]}
    </TextScramble>
  );
}

// --- Main Component ---
export function CategoryAccordionHero() {
  const [activeIndex, setActiveIndex] = useState(2);
  const user = useAuthStore((s) => s.user);

  return (
    <section className="bg-gradient-to-br from-tradealo-primary-light to-white overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 md:pt-6 md:pb-12">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          {/* Left: Text + CTAs */}
          <div className="w-full lg:w-[420px] shrink-0 text-center lg:text-left">
            <ScrambleWords
              texts={["Vende", "Subasta", "Intercambia"]}
              className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-tradealo-text leading-tight mb-4"
            />
            <p className="text-base md:text-lg text-tradealo-text-muted mb-6 max-w-md mx-auto lg:mx-0">
              Sin comisión, con la mejor seguridad.
            </p>

            <div className="flex items-center gap-3 justify-center lg:justify-start flex-wrap">
              <Link
                href={user ? '/my-listings/new' : '/register'}
                className="inline-flex items-center gap-2 bg-tradealo-primary text-white rounded-xl px-6 py-3 font-medium text-sm hover:bg-tradealo-primary-hover transition-colors shadow-sm"
              >
                Publicar
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/listings"
                className="inline-flex items-center gap-2 text-tradealo-primary border border-tradealo-primary rounded-xl px-6 py-3 font-medium text-sm hover:bg-tradealo-primary-light transition-colors"
              >
                Explorar
              </Link>
            </div>
          </div>

          {/* Right: Image Accordion */}
          <div className="flex-1 w-full">
            <div className="hidden sm:flex flex-row items-stretch gap-2 md:gap-3">
              {CATEGORY_DATA.map((item, index) => (
                <AccordionItem
                  key={item.id}
                  item={item}
                  isActive={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  href={`/listings?category=${item.slug}`}
                />
              ))}
            </div>

            {/* Mobile: accordion (same behavior as desktop) */}
            <div className="flex sm:hidden flex-row items-stretch gap-1.5 h-56">
              {CATEGORY_DATA.map((item, index) => (
                <Link
                  key={item.id}
                  href={`/listings?category=${item.slug}`}
                  className={`
                    relative rounded-xl overflow-hidden cursor-pointer
                    transition-all duration-700 ease-in-out shrink-0
                    ${index === activeIndex ? 'flex-[3]' : 'flex-[0.55]'}
                  `}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={(e) => {
                    if (index !== activeIndex) {
                      e.preventDefault();
                      setActiveIndex(index);
                    }
                  }}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3
                      className={`
                        font-heading text-white font-bold
                        transition-all duration-300 ease-in-out
                        ${
                          index === activeIndex
                            ? 'text-sm mb-0.5'
                            : 'text-[10px] [writing-mode:vertical-rl] rotate-180 mb-0'
                        }
                      `}
                    >
                      {item.title}
                    </h3>
                    {index === activeIndex && (
                      <p className="text-white/80 text-[11px] max-w-[140px] leading-tight animate-fade-in">
                        {item.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
