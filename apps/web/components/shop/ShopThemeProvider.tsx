'use client';
import { getThemeVars } from '@/lib/shop-themes';
import type { ShopTheme } from '@/types';

export default function ShopThemeProvider({
  theme,
  children,
}: {
  theme: ShopTheme;
  children: React.ReactNode;
}) {
  const vars = getThemeVars(theme);
  return (
    <div
      style={vars as React.CSSProperties}
      className="min-h-screen"
    >
      {children}
    </div>
  );
}
