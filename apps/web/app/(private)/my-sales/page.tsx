'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, TrendingUp, Send, ShieldCheck, X } from 'lucide-react';
import { orders, reviews, conversations } from '@/lib/api';
import { toast } from '@/lib/store';
import type { SaleOrder } from '@/lib/api';
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

  const filtered = (data ?? []).filter(
    (o) => tab === 'all' || o.status === tab,
  );

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-tradealo-text">
          Mis ventas
        </h1>
        <p className="text-sm text-tradealo-text-muted mt-1">
          Historial de productos que vendiste en Tradealo.
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
          {filtered.map((order) => (
            <SaleRow key={order.id} order={order} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SaleRow({ order }: { order: SaleOrder }) {
  const badge = STATUS_BADGE[order.status];
  const price = Number(order.listing.price);
  const [showResolve, setShowResolve] = useState(false);

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
          {order.status !== 'cancelled' && (
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<ShieldCheck size={14} />}
              onClick={() => setShowResolve(true)}
              className="text-tradealo-primary hover:bg-tradealo-primary-light"
            >
              Resolver reclamo
            </Button>
          )}
        </div>
      </div>

      {showResolve && (
        <ResolveModal
          order={order}
          onClose={() => setShowResolve(false)}
        />
      )}
    </li>
  );
}

function ResolveModal({ order, onClose }: { order: SaleOrder; onClose: () => void }) {
  const [message, setMessage] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      conversations.sendMessage(order.conversationId, { content: message.trim() }),
    onSuccess: () => {
      toast.success('Respuesta enviada al comprador correctamente.');
      onClose();
    },
    onError: () => {
      toast.error('No se pudo enviar la respuesta. Intentá de nuevo.');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-tradealo-primary shrink-0" />
            <h2 className="font-heading font-bold text-lg text-tradealo-text">
              Resolver reclamo
            </h2>
          </div>
          <button onClick={onClose} className="text-tradealo-text-muted hover:text-tradealo-text">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-tradealo-text-muted">
          Publicación: <span className="font-medium text-tradealo-text">{order.listing.title}</span>
        </p>
        <p className="text-xs text-tradealo-text-muted">
          Tu respuesta será enviada directamente al comprador a través del chat de la operación.
        </p>

        <div>
          <label className="block text-sm font-medium text-tradealo-text mb-1.5">
            Tu propuesta de resolución *
          </label>
          <textarea
            rows={5}
            placeholder="Explicá tu posición, ofrecé una solución o aclaración al comprador. Ej: 'El producto fue enviado el día X, podés verificarlo con el código de seguimiento...'."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            className="w-full rounded-lg border border-tradealo-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary resize-none"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button
            fullWidth
            loading={mutation.isPending}
            disabled={!message.trim()}
            leftIcon={<Send size={14} />}
            onClick={() => mutation.mutate()}
          >
            Enviar respuesta
          </Button>
        </div>
      </div>
    </div>
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
