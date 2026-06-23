'use client';

import { useState } from 'react';
import { ListingGallery } from './ListingGallery';
import { ListingVariantsBlock } from '@/components/listing/ListingVariantsBlock';
import { SaleActions } from '@/components/listing/SaleActions';
import { SellerCard } from '@/components/listing/SellerCard';
import { FavoriteButton } from '@/components/listing/FavoriteButton';
import { ShareButton } from '@/components/listing/ShareButton';
import { ReportButton } from '@/components/listing/ReportButton';
import type { ListingVariant } from '@/lib/api';
import type { Listing } from '@/types';

interface Props {
  listing: Listing;
  showPhone?: boolean;
  phone?: string;
  sellerUsername?: string;
  sellerShopSlug?: string | null;
  /** Static server-rendered content (description, attrs, reviews, questions) */
  children: React.ReactNode;
  /** Static price display for the aside (desktop) */
  priceDisplay?: React.ReactNode;
}

export function ListingDetailClient({
  listing,
  showPhone,
  phone,
  sellerUsername,
  sellerShopSlug,
  children,
  priceDisplay,
}: Props) {
  const [selectedVariant, setSelectedVariant] = useState<ListingVariant | null | undefined>(undefined);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Left column — gallery + static content */}
      <div className="flex-1 min-w-0 space-y-6">
        <ListingGallery
          images={listing.images}
          title={listing.title}
          listingId={listing.id}
          selectedVariantId={selectedVariant === undefined ? undefined : (selectedVariant?.id ?? null)}
        />
        {children}
      </div>

      {/* Right column sticky — variants + buy + seller */}
      <aside className="lg:w-[40%] lg:max-w-[400px] shrink-0 lg:sticky lg:top-24 lg:self-start space-y-4">
        {priceDisplay && <div className="hidden lg:block">{priceDisplay}</div>}
        <ListingVariantsBlock
          listingId={listing.id}
          categoryId={listing.category?.id}
          basePrice={listing.price}
          currency={listing.currency}
          onSelectedChange={setSelectedVariant}
          onVariantsLoaded={(count) => {
            if (count === 0) setSelectedVariant(undefined);
          }}
        />
        <SaleActions
          listing={listing}
          showPhone={showPhone}
          phone={phone}
          sellerUsername={sellerUsername}
          selectedVariant={selectedVariant}
        />
        <SellerCard user={listing.seller} shopSlug={sellerShopSlug} />
        <div className="flex gap-2">
          <FavoriteButton listingId={listing.id} variant="pill" />
          <ShareButton url={`/listing/${listing.id}`} title={listing.title} />
        </div>
        <div className="flex justify-end">
          <ReportButton
            targetType="listing"
            targetId={listing.id}
            ownerId={listing.seller?.id}
          />
        </div>
      </aside>
    </div>
  );
}
