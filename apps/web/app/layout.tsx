import type { Metadata } from 'next';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Rubik, Nunito_Sans } from 'next/font/google';
import { AppProviders } from '@/components/providers/AppProviders';
import './globals.css';

export const dynamic = 'force-dynamic';

const rubik = Rubik({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rubik',
  display: 'swap',
});

const nunito = Nunito_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tradealo — Marketplace de intercambio Argentina',
  description:
    'Comprá, vendé y trocá entre vecinos en toda Argentina. Lo que ya no usás se transforma en algo que sí.',
  metadataBase: new URL('https://trocalia.com.ar'),
  openGraph: {
    title: 'Tradealo',
    description: 'Marketplace argentino de intercambio C2C',
    type: 'website',
    locale: 'es_AR',
  },
};

function readFirebaseConfig() {
  // 1. Try runtime process.env first (works when env vars survive to render time)
  const fromEnv = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (fromEnv.apiKey) return fromEnv;

  // 2. Fallback: read the file written by the prebuild script.
  // Using readFileSync at render time bypasses webpack's JSON-import cache.
  try {
    const path = resolve(process.cwd(), 'apps/web/lib/firebase-config.generated.json');
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    try {
      const path = resolve(process.cwd(), 'lib/firebase-config.generated.json');
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch {
      return { apiKey: '', authDomain: '', projectId: '', appId: '' };
    }
  }
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const firebaseConfig = JSON.stringify(readFirebaseConfig());

  return (
    <html lang="es-AR" className={`${rubik.variable} ${nunito.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: `window.__FIREBASE_CONFIG__=${firebaseConfig}` }}
        />
      </head>
      <body className="bg-tradealo-bg text-tradealo-text font-sans antialiased min-h-screen">
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
