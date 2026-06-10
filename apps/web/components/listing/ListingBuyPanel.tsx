'use client';

import { useState } from 'react';
import { ListingVariantsBlock } from './ListingVariantsBlock';
import { SaleActions } from './SaleActions';
import type { ListingVariant } from '@/lib/api';
import type { Listing } from '@/types';

interface Props {
  listing: Listing;
  showPhone?: boolean;
  phone?: string;
  sellerUsername?: string;
}

export function ListingBuyPanel({ listing, showPhone, phone, sellerUsername }: Props) {
  const [selectedVariant, setSelectedVariant] = useState<ListingVariant | null | undefined>(undefined);

  return (
    <>
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
    </>
  );
}
