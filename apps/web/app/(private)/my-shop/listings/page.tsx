'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  ListChecks,
  Pause,
  Play,
  Download,
  Percent,
  Search,
  Filter,
} from 'lucide-react';
import { listings } from '@/lib/api';
import { API_URL } from '@/lib/constants';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/lib/store';
import type { Listing } from '@/types';

const STATUS_META: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }
> = {
  active: { label: 'Activo', variant: 'success' },
  paused: { label: 'Pausado', variant: 'warning' },
  draft: { label: 'Borrador', variant: 'default' },
  sold: { label: 'Vendido', variant: 'default' },
  expired: { label: 'Expirado', variant: 'danger' },
};

export default function MyListingsPage() {
  const [data, setData] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof listings.getMyListings>[0] = { limit: 100 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      const res = await listings.getMyListings(params);
      setData(res.data ?? []);
    } catch {
      toast.error('No se pudieron cargar tus listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((l) => l.title.toLowerCase().includes(q));
  }, [data, search]);

  const allSelectedOnPage =
    filtered.length > 0 && filtered.every((l) => selected.has(l.id));
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        for (const l of filtered) next.delete(l.id);
      } else {
        for (const l of filtered) next.add(l.id);
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkStatus = async (target: 'paused' | 'active') => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const ids = Array.from(selected);
      const res = await listings.bulkUpdateStatus(ids, target);
      toast.success(
        `${res.updated} ${res.updated === 1 ? 'listing actualizado' : 'listings actualizados'}` +
          (res.skipped > 0
            ? ` · ${res.skipped} saltados (estado no compatible)`
            : ''),
      );
      setSelected(new Set());
      await load();
    } catch {
      toast.error('No se pudo actualizar el estado');
    } finally {
      setBusy(false);
    }
  };

  const handleExportCsv = () => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('accessToken')
        : null;
    if (!token) {
      toast.error('Sesión expirada, ingresá de nuevo');
      return;
    }
    void fetch(`${API_URL}${listings.exportCsvUrl}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trocalia-listings-${new Date()
          .toISOString()
          .slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(() => toast.error('No se pudo descargar el CSV'));
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/my-shop"
          className="text-tradealo-text-muted hover:text-tradealo-text"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <ListChecks size={20} />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-tradealo-text">
              Mis listings
            </h1>
            <p className="text-sm text-tradealo-text-muted">
              {data.length} listings · {selected.size} seleccionados
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardBody className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Buscar por título…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search size={14} />}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
            >
              <option value="">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="paused">Pausados</option>
              <option value="draft">Borradores</option>
              <option value="expired">Expirados</option>
              <option value="sold">Vendidos</option>
            </select>
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
            <p className="text-xs text-tradealo-text-muted flex items-center gap-1">
              <Filter size={12} />
              Acciones bulk:
            </p>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Pause size={13} />}
              disabled={selected.size === 0 || busy}
              loading={busy}
              onClick={() => handleBulkStatus('paused')}
            >
              Pausar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Play size={13} />}
              disabled={selected.size === 0 || busy}
              loading={busy}
              onClick={() => handleBulkStatus('active')}
            >
              Republicar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Percent size={13} />}
              disabled={selected.size === 0}
              onClick={() => setShowPriceModal(true)}
            >
              Ajustar precio
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<Download size={13} />}
              onClick={handleExportCsv}
            >
              Exportar todo a CSV
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-tradealo-text-muted">
            <input
              type="checkbox"
              checked={allSelectedOnPage}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-gray-300 text-tradealo-primary"
            />
            Seleccionar todo ({filtered.length})
          </label>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="py-12 flex items-center justify-center text-sm text-tradealo-text-muted">
              Cargando…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-tradealo-text-muted">
              No hay listings que coincidan.
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((l) => {
                const meta = STATUS_META[l.status] ?? {
                  label: l.status,
                  variant: 'default' as const,
                };
                const firstImage = l.images?.[0]?.url;
                return (
                  <li
                    key={l.id}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(l.id)}
                      onChange={() => toggleOne(l.id)}
                      className="h-4 w-4 rounded border-gray-300 text-tradealo-primary shrink-0"
                    />
                    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0 relative">
                      {firstImage && (
                        <Image
                          src={firstImage}
                          alt={l.title}
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-tradealo-text truncate">
                        {l.title}
                      </p>
                      <p className="text-xs text-tradealo-text-muted">
                        {l.currency} {Number(l.price).toLocaleString('es-AR')}
                        {typeof l.stock === 'number' ? ` · stock ${l.stock}` : ''}
                      </p>
                    </div>
                    <Badge variant={meta.variant} className="shrink-0">
                      {meta.label}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      {showPriceModal && (
        <BulkPriceModal
          selectedCount={selected.size}
          onClose={() => setShowPriceModal(false)}
          onApply={async (mode, value) => {
            setBusy(true);
            try {
              const ids = Array.from(selected);
              const res = await listings.bulkAdjustPrice(ids, mode, value);
              toast.success(`${res.updated} precios actualizados`);
              setShowPriceModal(false);
              setSelected(new Set());
              await load();
            } catch (err) {
              const msg =
                (err as { response?: { data?: { message?: string } } })
                  ?.response?.data?.message ?? 'No se pudo actualizar';
              toast.error(msg);
            } finally {
              setBusy(false);
            }
          }}
          busy={busy}
        />
      )}
    </div>
  );
}

function BulkPriceModal({
  selectedCount,
  onClose,
  onApply,
  busy,
}: {
  selectedCount: number;
  onClose: () => void;
  onApply: (mode: 'percent' | 'absolute', value: number) => Promise<void>;
  busy: boolean;
}) {
  const [mode, setMode] = useState<'percent' | 'absolute'>('percent');
  const [value, setValue] = useState<string>('');

  const num = Number(value);
  const valid = value !== '' && Number.isFinite(num);

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-heading font-semibold text-base">
          Ajustar precio en {selectedCount}{' '}
          {selectedCount === 1 ? 'listing' : 'listings'}
        </h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={mode === 'percent'}
              onChange={() => setMode('percent')}
            />
            <span className="text-sm">
              Por porcentaje (ej: -10 para 10% off, +15 para 15% más)
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={mode === 'absolute'}
              onChange={() => setMode('absolute')}
            />
            <span className="text-sm">
              Setear el mismo precio absoluto (en moneda del listing)
            </span>
          </label>
        </div>
        <Input
          label={mode === 'percent' ? 'Porcentaje' : 'Precio nuevo'}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={mode === 'percent' ? '-10' : '5000'}
        />
        <p className="text-xs text-tradealo-text-muted">
          Los precios menores a 1 se redondean al mínimo. Esta acción no se puede
          deshacer (pero podés ajustar de nuevo).
        </p>
        <div className="flex gap-2">
          <Button
            onClick={() => onApply(mode, num)}
            loading={busy}
            disabled={!valid}
            className="flex-1"
          >
            Aplicar
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
