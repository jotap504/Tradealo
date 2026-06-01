'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Package, ShoppingBag, AlertTriangle, Swords, X, Eye } from 'lucide-react';
import { orders, disputes } from '@/lib/api';
import type { PurchaseOrder, AdminDispute } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { DisputeDetailModal } from '@/components/disputes/DisputeDetailModal';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/store';
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
          Mis compras
        </h1>
        <p className="text-sm text-tradealo-text-muted mt-1">
          Historial de productos que compraste en Tradealo.
        </p>
      </div>

      <div className="-mx-3 sm:mx-0 px-3 sm:px-0 flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors',
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
            {tab === 'all' ? 'Todavía no compraste nada' : 'No hay compras en este estado'}
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
          {filtered.map((order) => {
            const openDispute = (myDisputes ?? []).find(
              (d) =>
                d.listingId === order.listing.id &&
                d.respondentId === order.seller.id &&
                d.status === 'open',
            );
            return (
              <PurchaseRow key={order.id} order={order} openDispute={openDispute} />
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PurchaseRow({ order, openDispute }: { order: PurchaseOrder; openDispute?: AdminDispute }) {
  const badge = STATUS_BADGE[order.status];
  const price = Number(order.listing.price);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  return (
    <li className="bg-white rounded-2xl border border-tradealo-border p-3 sm:p-4 flex gap-3 sm:gap-4 min-w-0 overflow-hidden">
      <Link
        href={`/listing/${order.listing.id}`}
        className="shrink-0 w-14 h-14 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center"
      >
        {order.listing.primaryImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={order.listing.primaryImageUrl} alt={order.listing.title} className="w-full h-full object-cover" />
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
          <Badge variant={badge.variant} size="sm" className="shrink-0">{badge.label}</Badge>
        </div>

        <div className="flex items-center gap-1.5 mt-1 min-w-0">
          <Avatar src={order.seller.avatarUrl ?? undefined} username={order.seller.username ?? undefined} size="sm" />
          <span className="text-xs text-tradealo-text-muted truncate min-w-0">
            {order.seller.username ? (
              <Link href={`/seller/${order.seller.username}`} className="font-medium text-tradealo-text hover:text-tradealo-primary">
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
          <RelativeTime iso={order.createdAt} className="text-xs text-tradealo-text-muted" />
        </div>

        <div className="flex gap-2 mt-3 flex-wrap">
          <Link href={`/messages/${order.conversationId}`}>
            <Button size="sm" variant="secondary">Ver conversación</Button>
          </Link>
          {order.status !== 'cancelled' && (
            openDispute ? (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Eye size={14} />}
                onClick={() => setShowDetail(true)}
                className="text-amber-600 hover:bg-amber-50 border border-amber-200"
              >
                Ver reclamo abierto
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Swords size={14} />}
                onClick={() => setShowModal(true)}
                className="text-red-600 hover:bg-red-50"
              >
                Iniciar reclamo
              </Button>
            )
          )}
        </div>
      </div>

      {showModal && <DisputeModal order={order} onClose={() => setShowModal(false)} />}
      {showDetail && openDispute && (
        <DisputeDetailModal dispute={openDispute} onClose={() => setShowDetail(false)} />
      )}
    </li>
  );
}

function DisputeModal({ order, onClose }: { order: PurchaseOrder; onClose: () => void }) {
  const [step, setStep] = useState<'disclaimer' | 'form'>('disclaimer');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      disputes.create({
        respondentId: order.seller.id,
        listingId: order.listing.id,
        subject: subject.trim(),
        description: description.trim(),
      }),
    onSuccess: () => {
      toast.success('Reclamo iniciado. Un administrador revisará tu caso.');
      onClose();
    },
    onError: () => toast.error('No se pudo iniciar el reclamo. Intentá de nuevo.'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {step === 'disclaimer' ? (
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                <h2 className="font-heading font-bold text-lg text-tradealo-text">Aviso importante</h2>
              </div>
              <button onClick={onClose} className="text-tradealo-text-muted hover:text-tradealo-text">
                <X size={20} />
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-tradealo-text space-y-2">
              <p>
                <strong>Tradealo es una plataforma de intermediación digital</strong> que facilita el contacto entre usuarios de forma independiente.
                No somos parte de la transacción, no actuamos como vendedor ni como garante de ningún producto o servicio publicado.
              </p>
              <p>
                Tradealo <strong>no asume responsabilidad alguna</strong> por la veracidad de los anuncios, la calidad o estado de los productos,
                el cumplimiento de las entregas, ni por daños directos o indirectos derivados de operaciones entre usuarios.
              </p>
              <p>
                Al continuar, declarás que <strong>intentaste resolver esta situación de forma directa</strong> con el vendedor.
                Tu reclamo será revisado por nuestro equipo de mediación como facilitador.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" fullWidth onClick={onClose}>Cancelar</Button>
              <Button fullWidth onClick={() => setStep('form')}>Entendido, continuar</Button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Swords size={20} className="text-tradealo-primary shrink-0" />
                <h2 className="font-heading font-bold text-lg text-tradealo-text">Iniciar reclamo</h2>
              </div>
              <button onClick={onClose} className="text-tradealo-text-muted hover:text-tradealo-text">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-tradealo-text-muted">
              Publicación: <span className="font-medium text-tradealo-text">{order.listing.title}</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-tradealo-text mb-1.5">Motivo del reclamo *</label>
                <input
                  type="text"
                  placeholder="Ej: Producto no recibido, no coincide con la descripción..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  className="w-full rounded-lg border border-tradealo-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-tradealo-text mb-1.5">Descripción detallada *</label>
                <textarea
                  rows={4}
                  placeholder="Describí la situación con el mayor detalle posible..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                  className="w-full rounded-lg border border-tradealo-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" fullWidth onClick={() => setStep('disclaimer')}>Atrás</Button>
              <Button
                fullWidth
                loading={mutation.isPending}
                disabled={!subject.trim() || !description.trim()}
                onClick={() => mutation.mutate()}
              >
                Enviar reclamo
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
