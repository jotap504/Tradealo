'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Package, ShoppingBag } from 'lucide-react';
import { orders } from '@/lib/api';
import type { PurchaseOrder } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types';

type Tab = 'all' | OrderStatus;

const TAB_LABELS: Record<Tab, string> = {
  all: 'Todas',
  pending: 'Pendientes',
  delivered: 'Entregadas',
  completed: 'Completadas',
  cancelled: 'Canceladas',
};

const STATUS_BADGE: Record<OrderStatus, { label: string; variant: 'default' | 'primary' | 'success' | 'warning' | 'danger' }> = {
  pending: { label: 'Pendiente', variant: 'warning' },
  delivered: { label: 'Entregada', variant: 'primary' },
  completed: { label: 'Completada', variant: 'success' },
  cancelled: { label: 'Cancelada', variant: 'danger' },
};

export default function MyPurchasesPage() {
  const [tab, setTab] = useState<Tab>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'my-purchases'],
    queryFn: () => orders.getMyPurchases(),
    staleTime: 30_000,
  });

  const filtered = (data ?? []).filter(
    (o) => tab === 'all' || o.status === tab,
  );

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-tradealo-text">
          Mis compras
        </h1>
        <p className="text-sm text-tradealo-text-muted mt-1">
          Historial de productos que compraste en Tradealo.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              tab === t
                ? 'bg-tradealo-primary text-white'
                : 'bg-white border border-tradealo-border text-tradealo-text hover:bg-gray-50',
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-24" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-tradealo-border p-10 text-center">
          <ShoppingBag size={36} className="mx-auto text-tradealo-text-muted mb-3" />
          <h2 className="font-heading font-semibold text-lg">
            {tab === 'all'
              ? 'Todavía no compraste nada'
              : 'No hay compras en este estado'}
          </h2>
          <p className="text-sm text-tradealo-text-muted mt-1 mb-4">
            {tab === 'all'
              ? 'Cuando hagas tu primera compra, va a aparecer acá.'
              : 'Probá con otra pestaña.'}
          </p>
          {tab === 'all' && (
            <Link href="/listings">
              <Button>Explorar publicaciones</Button>
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((order) => (
            <PurchaseRow key={order.id} order={order} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PurchaseRow({ order }: { order: PurchaseOrder }) {
  const badge = STATUS_BADGE[order.status];
  const price = Number(order.listing.price);

  return (
    <li className="bg-white rounded-2xl border border-tradealo-border p-3 sm:p-4 flex gap-3 sm:gap-4">
      <Link
        href={`/listing/${order.listing.id}`}
        className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center"
      >
        {order.listing.primaryImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={order.listing.primaryImageUrl}
            alt={order.listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package size={24} className="text-tradealo-text-muted" />
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/listing/${order.listing.id}`} className="min-w-0 flex-1">
            <h3 className="font-medium text-tradealo-text text-sm sm:text-base truncate hover:text-tradealo-primary">
              {order.listing.title}
            </h3>
          </Link>
          <Badge variant={badge.variant} size="sm">
            {badge.label}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 mt-1 min-w-0">
          <Avatar
            src={order.seller.avatarUrl ?? undefined}
            username={order.seller.username ?? undefined}
            size="sm"
          />
          <span className="text-xs text-tradealo-text-muted truncate min-w-0">
            {order.seller.username ? (
              <Link
                href={`/seller/${order.seller.username}`}
                className="font-medium text-tradealo-text hover:text-tradealo-primary"
              >
                {order.seller.username}
              </Link>
            ) : (
              <span className="font-medium text-tradealo-text">Vendedor</span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
          <span className="font-heading font-semibold text-tradealo-text text-sm sm:text-base">
            {formatPrice(price, order.listing.currency)}
          </span>
          <RelativeTime
            iso={order.createdAt}
            className="text-xs text-tradealo-text-muted"
          />
        </div>

        <div className="mt-3">
          <Link href={`/messages/${order.conversationId}`}>
            <Button size="sm" variant="secondary">
              Ver conversación
            </Button>
          </Link>
        </div>
      </div>
    </li>
  );
}
