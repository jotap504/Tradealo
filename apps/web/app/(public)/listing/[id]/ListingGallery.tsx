'use client';

import { useState, useEffect } from 'react';
import { ImageIcon } from 'lucide-react';
import { FavoriteButton } from '@/components/listing/FavoriteButton';
import { ShareButton } from '@/components/listing/ShareButton';
import type { ListingImage } from '@/types';

interface Props {
  images: ListingImage[];
  title: string;
  listingId: string;
  /** When set, shows only images for this variant + unassigned images */
  selectedVariantId?: string | null;
}

export function ListingGallery({ images, title, listingId, selectedVariantId }: Props) {
  const visibleImages =
    selectedVariantId != null
      ? images.filter((img) => img.variantId === selectedVariantId || !img.variantId)
      : images;

  const displayImages = visibleImages.length > 0 ? visibleImages : images;

  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (selectedVariantId == null) { setSelected(0); return; }
    const idx = displayImages.findIndex((img) => img.variantId === selectedVariantId);
    setSelected(idx >= 0 ? idx : 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariantId]);

  const current = displayImages[Math.min(selected, displayImages.length - 1)];

  if (!images || images.length === 0) {
    return (
      <div className="relative aspect-[4/3] rounded-xl bg-gray-100 flex items-center justify-center text-tradealo-text-muted border border-tradealo-border">
        <ImageIcon size={48} />
        <div className="absolute top-3 right-3 flex gap-2">
          <ShareButton
            url={`/listing/${listingId}`}
            title={title}
            variant="icon"
            size={20}
          />
          <FavoriteButton listingId={listingId} size={20} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 border border-tradealo-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={`${title} — imagen ${selected + 1}`}
          className="w-full h-full object-contain"
        />
        <div className="absolute top-3 right-3 flex gap-2">
          <ShareButton
            url={`/listing/${listingId}`}
            title={title}
            variant="icon"
            size={20}
          />
          <FavoriteButton listingId={listingId} size={20} />
        </div>
      </div>
      {displayImages.length > 1 && (
        <div className="overflow-x-auto flex gap-2 pb-1">
          {displayImages.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setSelected(idx)}
              className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                idx === selected
                  ? 'border-tradealo-primary'
                  : 'border-tradealo-border hover:border-tradealo-primary/50'
              }`}
              aria-label={`Ver imagen ${idx + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="w-full h-full object-contain bg-gray-50" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
