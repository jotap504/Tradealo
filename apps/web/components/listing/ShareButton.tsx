'use client';

import { useState, useRef, useEffect } from 'react';
import { Share2, Link as LinkIcon, MessageCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  url: string;
  title: string;
  variant?: 'pill' | 'icon';
  className?: string;
  size?: number;
}

export function ShareButton({
  url,
  title,
  variant = 'pill',
  className,
  size = 18,
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fullUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${url}`
      : url;

  const canUseNativeShare =
    mounted &&
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1200);
    } catch {
      /* clipboard might be blocked */
    }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`${title}\n${fullUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setOpen(false);
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canUseNativeShare) {
      try {
        await navigator.share({ title, url: fullUrl });
      } catch {
        /* user cancelled */
      }
      return;
    }
    setOpen((v) => !v);
  };

  if (variant === 'icon') {
    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={handleClick}
          aria-label="Compartir publicación"
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-white/95 backdrop-blur-sm shadow-sm hover:bg-white transition-colors',
            className,
          )}
          style={{ width: size + 14, height: size + 14 }}
        >
          <Share2 size={size} className="text-tradealo-text-muted" />
        </button>
        {open && !canUseNativeShare && (
          <ShareMenu
            className="absolute top-full mt-2 right-0 w-56"
            onCopy={copyLink}
            onWhatsApp={shareWhatsApp}
            copied={copied}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'flex items-center gap-2 w-full justify-center h-10 px-4 rounded-xl border border-tradealo-border bg-white text-sm font-medium text-tradealo-text hover:bg-tradealo-bg transition-colors',
          className,
        )}
      >
        <Share2 size={16} />
        Compartir
      </button>

      {open && !canUseNativeShare && (
        <ShareMenu
          className="absolute bottom-full mb-2 left-0 right-0"
          onCopy={copyLink}
          onWhatsApp={shareWhatsApp}
          copied={copied}
        />
      )}
    </div>
  );
}

function ShareMenu({
  onCopy,
  onWhatsApp,
  copied,
  className,
}: {
  onCopy: () => void;
  onWhatsApp: () => void;
  copied: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-tradealo-border shadow-lg overflow-hidden z-50',
        className,
      )}
    >
      <button
        type="button"
        onClick={onCopy}
        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-tradealo-text hover:bg-tradealo-bg transition-colors"
      >
        {copied ? (
          <Check size={18} className="text-green-500" />
        ) : (
          <LinkIcon size={18} className="text-tradealo-text-muted" />
        )}
        {copied ? '¡Copiado!' : 'Copiar enlace'}
      </button>
      <button
        type="button"
        onClick={onWhatsApp}
        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-tradealo-text hover:bg-tradealo-bg transition-colors border-t border-tradealo-border"
      >
        <MessageCircle size={18} className="text-green-500" />
        Compartir por WhatsApp
      </button>
    </div>
  );
}
