'use client';
import { getThemeVars } from '@/lib/shop-themes';
import type { ShopTheme } from '@/types';

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function darken(hex: string, amount = 12): string {
  const [h, s, l] = hexToHsl(hex);
  return `hsl(${h}, ${s}%, ${Math.max(0, l - amount)}%)`;
}

export default function ShopThemeProvider({
  theme,
  primaryColor,
  children,
}: {
  theme: ShopTheme;
  primaryColor?: string | null;
  children: React.ReactNode;
}) {
  const vars = getThemeVars(theme);
  if (primaryColor && /^#[0-9a-fA-F]{6}$/.test(primaryColor)) {
    vars['--shop-primary'] = primaryColor;
    vars['--shop-primary-hover'] = darken(primaryColor);
  }
  return (
    <div style={vars as React.CSSProperties} className="min-h-screen">
      {children}
    </div>
  );
}
