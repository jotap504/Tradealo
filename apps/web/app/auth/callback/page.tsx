'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const userEncoded = searchParams.get('user');

    if (!accessToken || !refreshToken || !userEncoded) {
      router.replace('/login?error=oauth_failed');
      return;
    }

    try {
      // base64url → base64 → JSON
      const user = JSON.parse(atob(userEncoded.replace(/-/g, '+').replace(/_/g, '/')));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(user);
      setInitialized(true);
      router.replace('/dashboard');
    } catch {
      router.replace('/login?error=oauth_failed');
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 rounded-full border-2 border-tradealo-primary border-t-transparent animate-spin" />
    </div>
  );
}
