'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Phone, Send, ShoppingCart, Hammer, TrendingUp, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { useAuthStore, toast } from '@/lib/store';
import { listings } from '@/lib/api';
import { formatPrice, cn } from '@/lib/utils';
import type { Listing, Bid } from '@/types';

const contactSchema = z.object({
  message: z.string().min(10, 'Contanos un poco más (mínimo 10 caracteres)'),
});
type ContactValues = z.infer<typeof contactSchema>;

interface Props {
  listing: Listing;
  showPhone?: boolean;
  phone?: string;
  sellerUsername?: string;
}

export function SaleActions({ listing, showPhone, phone, sellerUsername }: Props) {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [currentStock, setCurrentStock] = useState(listing.stock);

  const {
    register: registerContact,
    handleSubmit: handleContactSubmit,
    formState: { errors: contactErrors },
  } = useForm<ContactValues>({ resolver: zodResolver(contactSchema) });

  const { data: bids = [], refetch: refetchBids } = useQuery({
    queryKey: ['bids', listing.id],
    queryFn: () => listings.getBids(listing.id),
    enabled: listing.saleType === 'auction',
    refetchInterval: 30_000,
  });

  const highestBid = bids.length > 0 ? bids[0] : null;

  const buyMutation = useMutation({
    mutationFn: () => listings.buyNow(listing.id),
    onSuccess: (result) => {
      toast.success('¡Compra realizada!');
      if (currentStock !== undefined) {
        setCurrentStock(currentStock - 1);
      }
      router.push(`/messages/${result.conversationId}`);
    },
    onError: () => {
      toast.error('No se pudo realizar la compra.');
    },
  });

  const bidMutation = useMutation({
    mutationFn: (amount: number) => listings.placeBid(listing.id, { amount }),
    onSuccess: (result) => {
      if (result.instantBuy) {
        toast.success('¡Compraste al precio deseado!');
        router.push(`/messages/${result.conversationId}`);
      } else {
        toast.success('Oferta realizada');
        refetchBids();
      }
    },
    onError: () => {
      toast.error('No se pudo realizar la oferta.');
    },
  });

  const onContact = async (values: ContactValues) => {
    setContactSubmitting(true);
    try {
      const result = await listings.contactSeller(listing.id, values);
      toast.success('Mensaje enviado');
      router.push(`/messages/${result.conversationId}`);
    } catch {
      toast.error('No pudimos enviar tu consulta. Probá más tarde.');
    } finally {
      setContactSubmitting(false);
    }
  };

  const waNumber = phone?.replace(/[^0-9]/g, '');
  const waLink =
    showPhone && waNumber
      ? `https://wa.me/${waNumber}?text=${encodeURIComponent(
          `Hola${sellerUsername ? ` ${sellerUsername}` : ''}, vi tu publicación en Tradealo y me interesa.`
        )}`
      : null;

  // Stock-based listing
  if (listing.saleType === 'stock') {
    const outOfStock = currentStock !== undefined && currentStock <= 0;

    return (
      <Card>
        <CardBody className="space-y-3">
          {waLink && (
            <a href={waLink} target="_blank" rel="noreferrer" className="block">
              <Button variant="whatsapp" fullWidth size="lg" leftIcon={<Phone size={18} />}>
                Chatear por WhatsApp
              </Button>
            </a>
          )}

          <form onSubmit={handleContactSubmit(onContact)} className="space-y-3">
            <p className="text-sm font-medium text-tradealo-text">Consultar al vendedor</p>
            {currentUser && (
              <div className="flex items-center gap-2 text-xs text-tradealo-text-muted bg-tradealo-bg rounded-lg px-3 py-2">
                <User size={14} />
                <span>{currentUser.username ?? currentUser.email}</span>
              </div>
            )}
            <Textarea
              placeholder="Hola, me interesa, ¿sigue disponible?"
              rows={3}
              {...registerContact('message')}
              error={contactErrors.message?.message}
            />
            <Button type="submit" fullWidth loading={contactSubmitting} leftIcon={<Send size={16} />}>
              Enviar consulta
            </Button>
          </form>

          <div className="border-t border-tradealo-border pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-tradealo-text">Stock disponible</span>
              <span className={cn('text-sm font-bold', outOfStock ? 'text-tradealo-error' : 'text-tradealo-success')}>
                {outOfStock ? 'Agotado' : currentStock}
              </span>
            </div>
            <Button
              fullWidth
              size="lg"
              leftIcon={<ShoppingCart size={18} />}
              disabled={outOfStock || buyMutation.isPending}
              loading={buyMutation.isPending}
              onClick={() => buyMutation.mutate()}
            >
              {outOfStock ? 'Sin stock' : 'Comprar'}
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Auction listing
  if (listing.saleType === 'auction') {
    return (
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-tradealo-text-muted uppercase tracking-wide font-medium">
                Oferta actual
              </p>
              <p className="text-xl font-bold text-tradealo-text mt-0.5">
                {highestBid
                  ? formatPrice(highestBid.amount / 100, listing.currency)
                  : formatPrice(listing.price, listing.currency)}
              </p>
            </div>
            {highestBid && (
              <div className="text-right">
                <p className="text-xs text-tradealo-text-muted">
                  {bids.length} oferta{bids.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>

          {listing.desiredPrice && (
            <div className="flex items-center gap-2 text-xs text-tradealo-text-muted bg-tradealo-bg rounded-lg px-3 py-2">
              <TrendingUp size={14} />
              <span>
                Precio deseado: {formatPrice(listing.desiredPrice / 100, listing.currency)}
                {' — '} Comprá ahora por este monto
              </span>
            </div>
          )}

          {listing.status !== 'active' ? (
            <Button fullWidth disabled>
              Subasta finalizada
            </Button>
          ) : (
            <BidForm
              minPrice={listing.price}
              currency={listing.currency}
              isPending={bidMutation.isPending}
              onSubmit={(amount) => bidMutation.mutate(amount)}
            />
          )}

          {listing.desiredPrice && listing.status === 'active' && (
            <Button
              fullWidth
              variant="secondary"
              size="lg"
              leftIcon={<ShoppingCart size={18} />}
              loading={bidMutation.isPending}
              onClick={() => bidMutation.mutate(listing.desiredPrice! / 100)}
            >
              Comprar ahora — {formatPrice(listing.desiredPrice / 100, listing.currency)}
            </Button>
          )}

          {waLink && (
            <a href={waLink} target="_blank" rel="noreferrer" className="block">
              <Button variant="whatsapp" fullWidth leftIcon={<Phone size={16} />}>
                Chatear por WhatsApp
              </Button>
            </a>
          )}

          {bids.length > 0 && <BidHistory bids={bids} currency={listing.currency} />}
        </CardBody>
      </Card>
    );
  }

  // Default: contact-only listing
  return (
    <Card>
      <CardBody className="space-y-3">
        {waLink && (
          <a href={waLink} target="_blank" rel="noreferrer" className="block">
            <Button variant="whatsapp" fullWidth size="lg" leftIcon={<Phone size={18} />}>
              Chatear por WhatsApp
            </Button>
          </a>
        )}

        <form onSubmit={handleContactSubmit(onContact)} className="space-y-3">
          <p className="text-sm font-medium text-tradealo-text">Enviar consulta</p>
          {currentUser && (
            <div className="flex items-center gap-2 text-xs text-tradealo-text-muted bg-tradealo-bg rounded-lg px-3 py-2">
              <User size={14} />
              <span>{currentUser.username ?? currentUser.email}</span>
            </div>
          )}
          <Textarea
            placeholder="Hola, me interesa, ¿sigue disponible? ¿Aceptás trueque?"
            rows={4}
            {...registerContact('message')}
            error={contactErrors.message?.message}
          />
          <Button type="submit" fullWidth loading={contactSubmitting} leftIcon={<Send size={16} />}>
            Enviar consulta
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

function BidForm({
  minPrice,
  currency,
  isPending,
  onSubmit,
}: {
  minPrice: number;
  currency: import('@/types').Currency;
  isPending: boolean;
  onSubmit: (amount: number) => void;
}) {
  const schema = z.object({
    amount: z.string().min(1, 'Ingresá un monto'),
  });
  const { register, handleSubmit, formState: { errors } } = useForm<{ amount: string }>({
    resolver: zodResolver(schema),
  });

  const onLocalSubmit = (values: { amount: string }) => {
    const amount = parseFloat(values.amount);
    if (isNaN(amount) || amount <= 0) return;
    if (amount < minPrice) {
      toast.error(`La oferta debe ser al menos ${formatPrice(minPrice, currency)}`);
      return;
    }
    onSubmit(amount);
  };

  return (
    <form onSubmit={handleSubmit(onLocalSubmit)} className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="number"
            step="0.01"
            placeholder={`Mín. ${formatPrice(minPrice, currency)}`}
            {...register('amount')}
            error={errors.amount?.message}
          />
        </div>
        <Button type="submit" leftIcon={<Hammer size={16} />} loading={isPending}>
          Ofertar
        </Button>
      </div>
    </form>
  );
}

function BidHistory({ bids, currency }: { bids: Bid[]; currency: import('@/types').Currency }) {
  return (
    <div className="border-t border-tradealo-border pt-3">
      <p className="text-xs font-medium text-tradealo-text-muted uppercase tracking-wide mb-2">
        Historial de ofertas
      </p>
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {bids.map((bid) => (
          <div key={bid.id} className="flex items-center justify-between text-sm">
            <span className="text-tradealo-text-muted text-xs">
              {bid.status === 'outbid' ? 'Superado' : bid.status === 'won' ? 'Ganador' : bid.status === 'lost' ? 'Perdida' : 'Activa'}
            </span>
            <span className={cn(
              'font-medium',
              bid.status === 'won' ? 'text-tradealo-success' : bid.status === 'active' ? 'text-tradealo-primary' : 'text-tradealo-text-muted'
            )}>
              {formatPrice(bid.amount / 100, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
