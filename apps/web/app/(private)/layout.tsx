'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/lib/store';

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (initialized && !user) {
      router.replace('/login');
    }
  }, [initialized, user, router]);

  if (!initialized) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-6">
          <Skeleton variant="text" className="w-1/3 h-8" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton variant="card" className="h-32" />
            <Skeleton variant="card" className="h-32" />
            <Skeleton variant="card" className="h-32" />
          </div>
          <Skeleton variant="card" className="h-64" />
        </main>
        <Footer />
      </>
    );
  }

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)] flex flex-col">{children}</main>
      <Footer />
    </>
  );
}
