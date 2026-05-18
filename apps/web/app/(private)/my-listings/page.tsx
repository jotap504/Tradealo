'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, PackageOpen } from 'lucide-react';
import { toast } from '@/lib/store';
import { listings } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { PriceDisplay } from '@/components/listing/PriceDisplay';
import { cn } from '@/lib/utils';
import { RelativeTime } from '@/components/ui/RelativeTime';
import type { Listing } from '@/types';

type Tab = 'active' | 'expired' | 'draft';

const STATUS_BADGES: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }
> = {
  active: { label: 'Activa', variant: 'success' },
  pending_review: { label: 'En revisión', variant: 'warning' },
  rejected: { label: 'Rechazada', variant: 'danger' },
  expired: { label: 'Expirada', variant: 'default' },
  draft: { label: 'Borrador', variant: 'default' },
};

export default function MyListingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-listings'],
    queryFn: () => listings.getMyListings(),
    staleTime: 60_000,
  });

  const allListings = data?.data ?? [];

  const filtered = allListings.filter((l) => {
    if (activeTab === 'active')
      return l.status === 'active' || l.status === 'pending_review';
    if (activeTab === 'expired')
      return l.status === 'expired' || l.status === 'rejected';
    return l.status === 'draft';
  });

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await listings.deleteListing(deletingId);
      toast.success('Publicación eliminada');
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
    } catch {
      toast.error('No se pudo eliminar la publicación');
    } finally {
      setConfirmOpen(false);
      setDeletingId(null);
    }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'active', label: 'Activas' },
    { key: 'expired', label: 'Expiradas' },
    { key: 'draft', label: 'Borradores' },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-tradealo-text">
          Mis publicaciones
        </h1>
        <Link href="/my-listings/new">
          <Button leftIcon={<Plus size={16} />}>Nueva publicación</Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === t.key
                ? 'bg-white text-tradealo-primary shadow-sm'
                : 'text-tradealo-text-muted hover:text-tradealo-text'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="card" className="h-28" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-tradealo-border rounded-2xl p-12 text-center">
          <PackageOpen
            size={40}
            className="mx-auto text-tradealo-text-muted mb-4 opacity-50"
          />
          <h3 className="font-heading font-semibold text-lg mb-1">
            Todavía no publicaste nada
          </h3>
          <p className="text-sm text-tradealo-text-muted mb-5">
            Empezá publicando tu primer artículo — es gratis.
          </p>
          <Link href="/my-listings/new">
            <Button leftIcon={<Plus size={16} />}>Publicar ahora</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((l) => (
            <ListingRow
              key={l.id}
              listing={l}
              onDelete={() => {
                setDeletingId(l.id);
                setConfirmOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setDeletingId(null);
        }}
        title="Eliminar publicación"
      >
        <div className="space-y-4">
          <p className="text-sm text-tradealo-text-muted">
            ¿Estás seguro de que querés eliminar esta publicación? Esta acción
            no se puede deshacer.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setConfirmOpen(false);
                setDeletingId(null);
              }}
            >
              Cancelar
            </Button>
            <Button variant="danger" fullWidth onClick={handleDelete}>
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ListingRow({
  listing,
  onDelete,
}: {
  listing: Listing;
  onDelete: () => void;
}) {
  const cover = listing.images?.[0]?.url;
  const badge = STATUS_BADGES[listing.status] ?? {
    label: listing.status,
    variant: 'default' as const,
  };

  return (
    <Card>
      <CardBody className="flex gap-4 items-center p-4">
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={listing.title}
              className="w-full h-full object-contain bg-gray-50"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-tradealo-text-muted text-xs">
              Sin foto
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-heading font-semibold text-sm text-tradealo-text truncate">
              {listing.title}
            </h3>
            <Badge variant={badge.variant} size="sm">
              {badge.label}
            </Badge>
          </div>
          <PriceDisplay
            amount={listing.price}
            currency={listing.currency}
            size="sm"
          />
          <p className="text-xs text-tradealo-text-muted mt-1">
            <RelativeTime iso={listing.createdAt} />
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <Link href={`/my-listings/${listing.id}/edit`}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Pencil size={14} />}
            >
              Editar
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Trash2 size={14} />}
            onClick={onDelete}
            className="text-tradealo-error hover:bg-red-50"
          >
            Eliminar
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
