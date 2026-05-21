'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  PackageOpen,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from 'lucide-react';
import { toast } from '@/lib/store';
import { listings, categories as categoriesApi } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { PriceDisplay } from '@/components/listing/PriceDisplay';
import { cn } from '@/lib/utils';
import { RelativeTime } from '@/components/ui/RelativeTime';
import type { Listing, Category } from '@/types';

type StatusTab = 'active' | 'finalized' | 'draft';

const STATUS_BADGES: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }
> = {
  active: { label: 'Activa', variant: 'success' },
  paused: { label: 'Pausada', variant: 'warning' },
  sold: { label: 'Vendida', variant: 'default' },
  expired: { label: 'Vencida', variant: 'default' },
  draft: { label: 'Borrador', variant: 'default' },
  removed: { label: 'Eliminada', variant: 'danger' },
};

const SALE_TYPE_LABELS: Record<string, string> = {
  contact: 'Contacto',
  fixed: 'Precio fijo',
  auction: 'Remate',
};

const TABS: { key: StatusTab; label: string; status: string }[] = [
  { key: 'active', label: 'Activas', status: 'active,paused' },
  { key: 'finalized', label: 'Finalizadas', status: 'sold,expired' },
  { key: 'draft', label: 'Borradores', status: 'draft' },
];

const SALE_TYPES = [
  { value: '', label: 'Todos' },
  { value: 'contact', label: 'Contacto' },
  { value: 'fixed', label: 'Precio fijo' },
  { value: 'auction', label: 'Remate' },
];

const PAGE_SIZE = 12;

export default function MyListingsPage() {
  const [activeTab, setActiveTab] = useState<StatusTab>('active');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [saleType, setSaleType] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queryClient = useQueryClient();

  const currentStatus = TABS.find((t) => t.key === activeTab)?.status ?? '';

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset to page 0 on any filter change
  useEffect(() => {
    setPage(0);
  }, [activeTab, search, saleType, categoryId]);

  const { data: catData } = useQuery({
    queryKey: ['categories-root'],
    queryFn: () => categoriesApi.getCategories(),
    staleTime: 300_000,
  });
  const rootCategories: Category[] = (catData ?? []).filter((c: Category) => !c.parentId);

  const { data, isLoading } = useQuery({
    queryKey: ['my-listings', page, currentStatus, search, saleType, categoryId],
    queryFn: () =>
      listings.getMyListings({
        offset: page * PAGE_SIZE,
        status: currentStatus,
        search: search || undefined,
        saleType: saleType || undefined,
        categoryId: categoryId || undefined,
        limit: PAGE_SIZE,
      }),
    staleTime: 60_000,
  });

  const allListings = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;

  const goFirst = useCallback(() => setPage(0), []);
  const goLast = useCallback(() => setPage(totalPages - 1), [totalPages]);
  const goPrev = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  const goNext = useCallback(
    () => setPage((p) => Math.min(totalPages - 1, p + 1)),
    [totalPages],
  );

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

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-tradealo-text">
            Mis publicaciones
          </h1>
          {total > 0 && !isLoading && (
            <p className="text-sm text-tradealo-text-muted mt-0.5">
              {total} {total === 1 ? 'publicación' : 'publicaciones'}
            </p>
          )}
        </div>
        <Link href="/my-listings/new">
          <Button leftIcon={<Plus size={16} />}>Nueva publicación</Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-tradealo-text-muted pointer-events-none"
        />
        <input
          type="text"
          placeholder="Buscar por título..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-tradealo-border bg-white text-sm text-tradealo-text placeholder:text-tradealo-text-muted focus:outline-none focus:ring-2 focus:ring-tradealo-primary/30 focus:border-tradealo-primary transition-colors"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-tradealo-text-muted hover:text-tradealo-text transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-col gap-3">
        {/* Status tabs */}
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
                  : 'text-tradealo-text-muted hover:text-tradealo-text',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Category + sale type in same row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category dropdown */}
          {rootCategories.length > 0 && (
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-8 pl-3 pr-8 rounded-lg border border-tradealo-border bg-white text-xs text-tradealo-text focus:outline-none focus:ring-2 focus:ring-tradealo-primary/30 focus:border-tradealo-primary transition-colors appearance-none cursor-pointer"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
            >
              <option value="">Todas las categorías</option>
              {rootCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}

          {/* Sale type chips */}
          <div className="flex gap-1.5 flex-wrap">
            {SALE_TYPES.map((st) => (
              <button
                key={st.value}
                type="button"
                onClick={() => setSaleType(st.value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  saleType === st.value
                    ? 'bg-tradealo-primary text-white border-tradealo-primary'
                    : 'bg-white text-tradealo-text-muted border-tradealo-border hover:border-tradealo-primary hover:text-tradealo-primary',
                )}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Listing list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="card" className="h-28" />
          ))}
        </div>
      ) : allListings.length === 0 ? (
        <div className="bg-white border border-dashed border-tradealo-border rounded-2xl p-12 text-center">
          <PackageOpen
            size={40}
            className="mx-auto text-tradealo-text-muted mb-4 opacity-50"
          />
          <h3 className="font-heading font-semibold text-lg mb-1">
            {search ? 'Sin resultados' : 'Nada por acá'}
          </h3>
          <p className="text-sm text-tradealo-text-muted mb-5">
            {search
              ? `No encontramos publicaciones que coincidan con "${search}".`
              : activeTab === 'active'
                ? 'Empezá publicando tu primer artículo — es gratis.'
                : activeTab === 'draft'
                  ? 'No tenés publicaciones en borrador.'
                  : 'No hay publicaciones finalizadas todavía.'}
          </p>
          {!search && activeTab === 'active' && (
            <Link href="/my-listings/new">
              <Button leftIcon={<Plus size={16} />}>Publicar ahora</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {allListings.map((l) => (
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goFirst}
              disabled={!hasPrev}
              title="Primera página"
              className="p-1.5 rounded-lg border border-tradealo-border bg-white text-tradealo-text-muted disabled:opacity-40 hover:border-tradealo-primary hover:text-tradealo-primary transition-colors disabled:cursor-not-allowed"
            >
              <ChevronsLeft size={16} />
            </button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ChevronLeft size={15} />}
              onClick={goPrev}
              disabled={!hasPrev}
            >
              Anterior
            </Button>
          </div>

          <span className="text-sm text-tradealo-text-muted font-medium whitespace-nowrap">
            Página {page + 1} de {totalPages}
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              rightIcon={<ChevronRight size={15} />}
              onClick={goNext}
              disabled={!hasNext}
            >
              Siguiente
            </Button>
            <button
              type="button"
              onClick={goLast}
              disabled={!hasNext}
              title="Última página"
              className="p-1.5 rounded-lg border border-tradealo-border bg-white text-tradealo-text-muted disabled:opacity-40 hover:border-tradealo-primary hover:text-tradealo-primary transition-colors disabled:cursor-not-allowed"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
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
            {listing.saleType && listing.saleType !== 'contact' && (
              <Badge variant="default" size="sm">
                {SALE_TYPE_LABELS[listing.saleType] ?? listing.saleType}
              </Badge>
            )}
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
