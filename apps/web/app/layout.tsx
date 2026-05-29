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
  const fromEnv = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (fromEnv.apiKey) return fromEnv;

  const candidatePaths = [
    resolve(process.cwd(), 'apps/web/lib/firebase-config.generated.json'),
    resolve(process.cwd(), 'lib/firebase-config.generated.json'),
    resolve(process.cwd(), '.next/server/apps/web/lib/firebase-config.generated.json'),
  ];
  for (const path of candidatePaths) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch {
      // try next
    }
  }
  return { apiKey: '', authDomain: '', projectId: '', appId: '' };
}

function readDiagnostic() {
  const nextPublicKeys = Object.keys(process.env).filter((k) => k.startsWith('NEXT_PUBLIC_'));
  const cwd = process.cwd();
  let fileFound: string | null = null;
  let fileContent: string | null = null;
  for (const p of [
    resolve(cwd, 'apps/web/lib/firebase-config.generated.json'),
    resolve(cwd, 'lib/firebase-config.generated.json'),
  ]) {
    try {
      const c = readFileSync(p, 'utf-8');
      fileFound = p;
      fileContent = c.slice(0, 120);
      break;
    } catch {
      // continue
    }
  }
  return {
    builtAt: 'COMMIT_8b2732a_REV2',
    cwd,
    apiKeyEnvLen: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.length ?? 0,
    nextPublicKeys,
    fileFound,
    fileContentPreview: fileContent,
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const firebaseConfig = JSON.stringify(readFirebaseConfig());
  const diagnostic = JSON.stringify(readDiagnostic());

  return (
    <html lang="es-AR" className={`${rubik.variable} ${nunito.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: `window.__FIREBASE_CONFIG__=${firebaseConfig};window.__FIREBASE_DIAGNOSTIC__=${diagnostic}` }}
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
