import Link from 'next/link';
import { MapPin, ShieldCheck, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { PriceDisplay } from './PriceDisplay';
import { cn, formatRelative, truncate } from '@/lib/utils';
import type { Listing } from '@/types';

interface Props {
  listing: Listing;
  variant?: 'grid' | 'list';
  className?: string;
}

export function ListingCard({ listing, variant = 'grid', className }: Props) {
  const cover = listing.images?.[0]?.url;
  const isPremium = listing.type === 'premium';
  const seller = listing.seller;

  if (variant === 'list') {
    return (
      <Link
        href={`/listing/${listing.id}`}
        data-testid="listing-card"
        className={cn(
          'group flex flex-col sm:flex-row bg-white rounded-xl border border-tradealo-border overflow-hidden shadow-card hover:shadow-card-hover transition-shadow',
          className
        )}
      >
        <div className="relative sm:w-1/3 aspect-[4/3] sm:aspect-auto sm:min-h-[180px] bg-gray-100 shrink-0">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
            />
          ) : (
            <Placeholder />
          )}
          {isPremium && (
            <Badge
              variant="premium"
              className="absolute top-2 left-2 backdrop-blur"
            >
              <Sparkles size={11} />
              Destacado
            </Badge>
          )}
        </div>
        <div className="flex-1 p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-heading font-semibold text-base text-tradealo-text group-hover:text-tradealo-primary transition-colors">
              {truncate(listing.title, 80)}
            </h3>
          </div>
          <p className="text-sm text-tradealo-text-muted line-clamp-2">
            {truncate(listing.description, 160)}
          </p>
          <div className="mt-auto flex items-end justify-between gap-3">
            <PriceDisplay
              amount={listing.price}
              currency={listing.currency}
              negotiable={listing.negotiable}
              size="lg"
            />
            {listing.saleType === 'stock' && listing.stock !== undefined && listing.stock !== null && (
              <span className="text-xs text-tradealo-text-muted whitespace-nowrap">
                {listing.stock > 0 ? `Stock: ${listing.stock}` : 'Agotado'}
              </span>
            )}
            <SellerStrip seller={seller} province={listing.province} createdAt={listing.createdAt} />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/listing/${listing.id}`}
      data-testid="listing-card"
      className={cn(
        'group flex flex-col bg-white rounded-xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5',
        isPremium
          ? 'border-amber-300 shadow-card hover:shadow-card-hover ring-1 ring-amber-200/40'
          : 'border-tradealo-border shadow-card hover:shadow-card-hover',
        className
      )}
    >
      <div className="relative aspect-[4/3] bg-gray-100">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <Placeholder />
        )}
        {isPremium && (
          <Badge
            variant="premium"
            className="absolute top-2 left-2 shadow-sm backdrop-blur"
          >
            <Sparkles size={11} />
            Destacado
          </Badge>
        )}
        {listing.isCollectible && (
          <Badge
            variant="primary"
            className="absolute top-2 right-2 shadow-sm backdrop-blur"
          >
            Coleccionable
          </Badge>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-heading font-semibold text-[15px] leading-snug text-tradealo-text group-hover:text-tradealo-primary transition-colors line-clamp-2">
          {listing.title}
        </h3>
        <div className="flex items-center justify-between gap-2">
          <PriceDisplay
            amount={listing.price}
            currency={listing.currency}
            negotiable={listing.negotiable}
            size="lg"
          />
          {listing.saleType === 'stock' && listing.stock !== undefined && listing.stock !== null && (
            <span className="text-xs text-tradealo-text-muted whitespace-nowrap">
              {listing.stock > 0 ? `Stock: ${listing.stock}` : 'Agotado'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-tradealo-text-muted">
          <MapPin size={12} />
          <span className="truncate" data-testid="listing-location">
            {listing.city ? `${listing.city}, ` : ''}
            {listing.province}
          </span>
        </div>
        <div className="mt-auto pt-3 border-t border-tradealo-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar
              src={seller?.avatarUrl}
              username={seller?.username ?? seller?.email}
              size="sm"
            />
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-xs font-medium text-tradealo-text truncate">
                {seller?.username ?? 'Usuario'}
              </span>
              {seller?.kycLevel && seller.kycLevel >= 1 && (
                <ShieldCheck
                  size={12}
                  className="text-tradealo-primary shrink-0"
                  aria-label="Identidad verificada"
                />
              )}
            </div>
          </div>
          <span className="text-[10px] text-tradealo-text-muted shrink-0">
            {formatRelative(listing.createdAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function SellerStrip({
  seller,
  province,
  createdAt,
}: {
  seller: Listing['seller'];
  province: string;
  createdAt: string;
}) {
  return (
    <div className="flex flex-col items-end text-xs text-tradealo-text-muted">
      <div className="flex items-center gap-1">
        <MapPin size={12} />
        <span>{province}</span>
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        <Avatar
          src={seller?.avatarUrl}
          username={seller?.username ?? seller?.email}
          size="sm"
        />
        <span className="font-medium text-tradealo-text">
          {seller?.username ?? 'Usuario'}
        </span>
        {seller?.kycLevel && seller.kycLevel >= 1 && (
          <ShieldCheck size={11} className="text-tradealo-primary" />
        )}
      </div>
      <span className="mt-1 text-[10px]">{formatRelative(createdAt)}</span>
    </div>
  );
}

function Placeholder() {
  return (
    <div className="w-full h-full flex items-center justify-center text-tradealo-text-muted bg-gradient-to-br from-gray-100 to-gray-50">
      <ImageIcon size={32} />
    </div>
  );
}
