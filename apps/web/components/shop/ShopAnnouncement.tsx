'use client';
import { useState, useEffect } from 'react';

interface ShopAnnouncementProps {
  shopId: string;
  text: string | null;
  expiresAt: string | null;
}

export default function ShopAnnouncement({ shopId, text, expiresAt }: ShopAnnouncementProps) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const storageKey = `shop-ann-${shopId}`;

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && sessionStorage.getItem(storageKey)) {
      setDismissed(true);
    }
  }, [storageKey]);

  if (!mounted || !text) return null;
  if (expiresAt && new Date(expiresAt) < new Date()) return null;
  if (dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(storageKey, '1');
    setDismissed(true);
  };

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium"
      style={{ backgroundColor: 'var(--shop-primary)', color: '#fff' }}
    >
      <span className="flex-1 text-center">{text}</span>
      <button
        onClick={handleDismiss}
        className="shrink-0 opacity-80 hover:opacity-100 text-lg leading-none"
        aria-label="Cerrar anuncio"
      >
        ✕
      </button>
    </div>
  );
}
