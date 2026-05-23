'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Megaphone } from 'lucide-react';

interface ShopAnnouncementProps {
  shopId: string;
  text: string | null;
  expiresAt: string | null;
}

export default function ShopAnnouncement({ shopId, text, expiresAt }: ShopAnnouncementProps) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Key includes a hash of the text so a new announcement always shows again
  const textHash = text
    ? text.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffffffff, 0)
        .toString(36)
    : '';
  const storageKey = `shop-ann-${shopId}-${textHash}`;

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && sessionStorage.getItem(storageKey)) {
      setDismissed(true);
    }
  }, [storageKey]);

  if (!mounted || !text) return null;
  if (expiresAt && new Date(expiresAt) < new Date()) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(storageKey, '1');
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium"
            style={{ backgroundColor: 'var(--shop-primary)', color: '#fff' }}
          >
            <Megaphone size={15} className="shrink-0 opacity-80" />
            <span className="flex-1 text-center leading-snug">{text}</span>
            <button
              onClick={handleDismiss}
              className="shrink-0 opacity-70 hover:opacity-100 transition-opacity p-0.5 rounded"
              aria-label="Cerrar anuncio"
            >
              <X size={15} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
