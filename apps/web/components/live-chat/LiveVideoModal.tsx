'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { LiveChat } from './LiveChat';
import { YouTubePlayer } from './YouTubePlayer';
import type { Listing } from '@/types';

interface Props {
  listing: Listing;
  open: boolean;
  onClose: () => void;
}

export function LiveVideoModal({ listing, open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex h-screen"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Content */}
      <div className="relative z-10 w-full h-full flex flex-col lg:flex-row">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        {/* Video */}
        <div className="relative w-full lg:w-[60%] h-[40vh] lg:h-full bg-black flex items-center justify-center overflow-hidden shrink-0">
          {listing.youtubeLiveId ? (
            <YouTubePlayer videoId={listing.youtubeLiveId} />
          ) : (
            <div className="text-white/60 text-sm">Video no disponible</div>
          )}
        </div>

        {/* Chat */}
        <div className="w-full lg:w-[40%] flex-1 min-h-0 lg:h-full bg-white">
          <LiveChat listingId={listing.id} />
        </div>
      </div>
    </div>,
    document.body
  );
}
