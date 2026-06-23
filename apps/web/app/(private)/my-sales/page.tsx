'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, TrendingUp, Send, Eye } from 'lucide-react';
import { orders, reviews, disputes } from '@/lib/api';
import type { SaleOrder, AdminDispute } from '@/lib/api';
import { DisputeDetailModal } from '@/components/disputes/DisputeDetailModal';
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

export default function MySalesPage() {
  const [tab, setTab] = useState<Tab>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'my-sales'],
    queryFn: () => orders.getMySales(),
    staleTime: 30_000,
  });

  const { data: myDisputes } = useQuery({
    queryKey: ['disputes-mine'],
    queryFn: () => disputes.listMine(),
    staleTime: 30_000,
  });

  const filtered = (data ?? []).filter(
    (o) => tab === 'all' || o.status === tab,
  );

  return (
    <div className="mx-auto max-w-4xl w-full px-3 sm:px-6 py-8 space-y-6 overflow-x-hidden">
      <div>
        <h1 className="font-heading text-2xl font-bold text-tradealo-text">
          Mis ventas
        </h1>
        <p className="text-sm text-tradealo-text-muted mt-1">
          Historial de productos que vendiste en Tradealo.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pb-1">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'px-3 sm:px-4 h-8 sm:h-9 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors',
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
          <TrendingUp size={36} className="mx-auto text-tradealo-text-muted mb-3" />
          <h2 className="font-heading font-semibold text-lg">
            {tab === 'all'
              ? 'Todavía no vendiste nada'
              : 'No hay ventas en este estado'}
          </h2>
          <p className="text-sm text-tradealo-text-muted mt-1 mb-4">
            {tab === 'all'
              ? 'Cuando hagas tu primera venta, va a aparecer acá.'
              : 'Probá con otra pestaña.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((order) => {
            const openDispute = (myDisputes ?? []).find(
              (d) =>
                d.listingId === order.listing.id &&
                d.initiatorId === order.buyer.id &&
                d.status === 'open',
            );
            return <SaleRow key={order.id} order={order} openDispute={openDispute} />;
          })}
        </ul>
      )}
    </div>
  );
}

function SaleRow({ order, openDispute }: { order: SaleOrder; openDispute?: AdminDispute }) {
  const badge = STATUS_BADGE[order.status];
  const price = Number(order.listing.price);
  const [showDetail, setShowDetail] = useState(false);

  return (
    <li className="bg-white rounded-2xl border border-tradealo-border p-3 sm:p-4 flex gap-3 sm:gap-4 min-w-0 overflow-hidden">
      <Link
        href={`/listing/${order.listing.id}`}
        className="shrink-0 w-14 h-14 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center"
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
        <div className="flex items-start justify-between gap-2 min-w-0">
          <Link href={`/listing/${order.listing.id}`} className="min-w-0 flex-1">
            <h3 className="font-medium text-tradealo-text text-sm sm:text-base truncate hover:text-tradealo-primary">
              {order.listing.title}
            </h3>
          </Link>
          <Badge variant={badge.variant} size="sm" className="shrink-0">
            {badge.label}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 mt-1 min-w-0">
          <Avatar
            src={order.buyer.avatarUrl ?? undefined}
            username={order.buyer.username ?? undefined}
            size="sm"
          />
          <span className="text-xs text-tradealo-text-muted truncate min-w-0">
            {order.buyer.username ? (
              <Link
                href={`/seller/${order.buyer.username}`}
                className="font-medium text-tradealo-text hover:text-tradealo-primary"
              >
                {order.buyer.username}
              </Link>
            ) : (
              <span className="font-medium text-tradealo-text">Comprador</span>
            )}
          </span>
        </div>

        {order.variantAttributeValues && Object.keys(order.variantAttributeValues).length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(order.variantAttributeValues).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 bg-tradealo-primary/10 text-tradealo-primary text-[11px] font-medium px-2 py-0.5 rounded-full"
              >
                <span className="text-tradealo-text-muted capitalize">{k}:</span> {String(v)}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
          <span className="font-heading font-semibold text-tradealo-text text-sm sm:text-base">
            {formatPrice(price, order.listing.currency)}
          </span>
          <RelativeTime
            iso={order.createdAt}
            className="text-xs text-tradealo-text-muted"
          />
        </div>

        {/* Buyer review section */}
        {order.buyerReview && (
          <div className="mt-2 pt-2 border-t border-tradealo-border">
            <p className="text-xs font-medium text-tradealo-text-muted mb-1">
              Calificación del comprador:
            </p>
            <StarRating rating={order.buyerReview.rating} />
            {order.buyerReview.comment && (
              <p className="text-sm text-tradealo-text mt-0.5">
                {order.buyerReview.comment}
              </p>
            )}
            <BuyerReviewReply
              reviewId={order.buyerReview.id}
              replyText={order.buyerReview.replyText}
              replyCreatedAt={order.buyerReview.replyCreatedAt}
            />
          </div>
        )}

        {/* Seller review (my rating of the buyer) */}
        {order.sellerReview && (
          <div className="mt-2 pt-2 border-t border-tradealo-border">
            <p className="text-xs font-medium text-tradealo-text-muted mb-1">
              Tu calificación al comprador:
            </p>
            <StarRating rating={order.sellerReview.rating} />
            {order.sellerReview.comment && (
              <p className="text-sm text-tradealo-text mt-0.5">
                {order.sellerReview.comment}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-3 flex-wrap">
          <Link href={`/messages/${order.conversationId}`}>
            <Button size="sm" variant="secondary">
              Ver conversación
            </Button>
          </Link>
          {openDispute && (
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<Eye size={14} />}
              onClick={() => setShowDetail(true)}
              className="text-amber-600 hover:bg-amber-50 border border-amber-200"
            >
              Ver reclamo
            </Button>
          )}
        </div>
      </div>

      {showDetail && openDispute && (
        <DisputeDetailModal
          dispute={openDispute}
          onClose={() => setShowDetail(false)}
        />
      )}
    </li>
  );
}


function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'text-sm',
            i < rating ? 'text-amber-400' : 'text-gray-200',
          )}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function BuyerReviewReply({
  reviewId,
  replyText,
  replyCreatedAt,
}: {
  reviewId: string;
  replyText: string | null;
  replyCreatedAt: string | null;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(replyText ?? '');

  const replyMutation = useMutation({
    mutationFn: (body: string) => reviews.replyToReview(reviewId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'my-sales'] });
      setEditing(false);
    },
  });

  if (!editing && !replyText) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs font-medium text-tradealo-primary hover:underline mt-1"
      >
        Responder
      </button>
    );
  }

  if (!editing && replyText) {
    return (
      <div className="mt-1.5 pl-3 border-l-2 border-tradealo-primary/30">
        <p className="text-xs text-tradealo-text-muted mb-0.5">Tu réplica:</p>
        <p className="text-sm text-tradealo-text">{replyText}</p>
        {replyCreatedAt && (
          <RelativeTime
            iso={replyCreatedAt}
            className="text-xs text-tradealo-text-muted mt-0.5"
          />
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-medium text-tradealo-primary hover:underline mt-1"
        >
          Editar
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1.5 space-y-1.5">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribí tu descargo o aclaración sobre la calificación recibida..."
        rows={3}
        maxLength={1000}
        className="w-full rounded-lg border border-tradealo-border px-3 py-2 text-sm focus:outline-none focus:border-tradealo-primary focus:ring-2 focus:ring-tradealo-primary-light resize-none"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => replyMutation.mutate(text)}
          disabled={!text.trim() || replyMutation.isPending}
          leftIcon={<Send size={14} />}
        >
          {replyMutation.isPending ? 'Enviando...' : 'Enviar'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setEditing(false);
            setText(replyText ?? '');
          }}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
