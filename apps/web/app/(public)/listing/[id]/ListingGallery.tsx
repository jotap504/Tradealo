'use client';

import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { FavoriteButton } from '@/components/listing/FavoriteButton';
import { ShareButton } from '@/components/listing/ShareButton';
import type { ListingImage } from '@/types';

interface Props {
  images: ListingImage[];
  title: string;
  listingId: string;
}

export function ListingGallery({ images, title, listingId }: Props) {
  const [selected, setSelected] = useState(0);
  const current = images[selected];

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
      {images.length > 1 && (
        <div className="overflow-x-auto flex gap-2 pb-1">
          {images.map((img, idx) => (
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
