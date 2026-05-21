import type { ShopTheme } from '@/types';

export interface ThemeVars {
  '--shop-bg': string;
  '--shop-surface': string;
  '--shop-text': string;
  '--shop-text-muted': string;
  '--shop-primary': string;
  '--shop-primary-hover': string;
  '--shop-border': string;
  '--shop-font': string;
}

export const SHOP_THEMES: Record<ShopTheme, ThemeVars> = {
  minimalista: {
    '--shop-bg': '#ffffff',
    '--shop-surface': '#f9fafb',
    '--shop-text': '#111827',
    '--shop-text-muted': '#6b7280',
    '--shop-primary': '#14b8a6',
    '--shop-primary-hover': '#0d9488',
    '--shop-border': '#e5e7eb',
    '--shop-font': 'ui-sans-serif, system-ui, sans-serif',
  },
  oscuro: {
    '--shop-bg': '#0f172a',
    '--shop-surface': '#1e293b',
    '--shop-text': '#f1f5f9',
    '--shop-text-muted': '#94a3b8',
    '--shop-primary': '#38bdf8',
    '--shop-primary-hover': '#0ea5e9',
    '--shop-border': '#334155',
    '--shop-font': 'ui-sans-serif, system-ui, sans-serif',
  },
  vibrante: {
    '--shop-bg': '#fef9c3',
    '--shop-surface': '#ffffff',
    '--shop-text': '#1c1917',
    '--shop-text-muted': '#78716c',
    '--shop-primary': '#f97316',
    '--shop-primary-hover': '#ea6c08',
    '--shop-border': '#fed7aa',
    '--shop-font': 'ui-sans-serif, system-ui, sans-serif',
  },
  clasico: {
    '--shop-bg': '#fafaf9',
    '--shop-surface': '#ffffff',
    '--shop-text': '#292524',
    '--shop-text-muted': '#78716c',
    '--shop-primary': '#78716c',
    '--shop-primary-hover': '#57534e',
    '--shop-border': '#e7e5e4',
    '--shop-font': 'ui-serif, Georgia, serif',
  },
  boutique: {
    '--shop-bg': '#fdf4ff',
    '--shop-surface': '#ffffff',
    '--shop-text': '#3b1764',
    '--shop-text-muted': '#7e22ce',
    '--shop-primary': '#a855f7',
    '--shop-primary-hover': '#9333ea',
    '--shop-border': '#e9d5ff',
    '--shop-font': 'ui-serif, Georgia, serif',
  },
};

export function getThemeVars(theme: ShopTheme): ThemeVars {
  return SHOP_THEMES[theme] ?? SHOP_THEMES.minimalista;
}
