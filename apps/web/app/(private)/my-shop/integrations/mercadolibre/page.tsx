'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import {
  mercadolibre,
  type MlItemRow,
  type MlImportJob,
} from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/lib/store';

const MAX_SELECTION = 200;

export default function MercadoLibreImportPage() {
  const [tab, setTab] = useState<'items' | 'jobs'>('items');

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/my-shop/integrations"
          className="text-tradealo-text-muted hover:text-tradealo-text"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold text-tradealo-text">
            Importar desde MercadoLibre
          </h1>
          <p className="text-sm text-tradealo-text-muted">
            La IA reescribe título y descripción. Vos confirmás antes de
            publicar.
          </p>
        </div>
      </div>

      <div className="flex border-b border-tradealo-border">
        <TabButton
          active={tab === 'items'}
          onClick={() => setTab('items')}
          label="Productos disponibles"
        />
        <TabButton
          active={tab === 'jobs'}
          onClick={() => setTab('jobs')}
          label="Importaciones"
        />
      </div>

      {tab === 'items' ? <ItemsTab /> : <JobsTab />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 -mb-px text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-tradealo-primary text-tradealo-primary'
          : 'border-transparent text-tradealo-text-muted hover:text-tradealo-text'
      }`}
    >
      {label}
    </button>
  );
}

function ItemsTab() {
  const [items, setItems] = useState<MlItemRow[]>([]);
  const [scrollId, setScrollId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    mercadolibre
      .listItems()
      .then((res) => {
        setItems(res.items);
        setScrollId(res.scrollId);
      })
      .catch(() => toast.error('No se pudo cargar tu catálogo de MercadoLibre'))
      .finally(() => setLoading(false));
  }, []);

  const loadMore = async () => {
    if (!scrollId || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await mercadolibre.listItems(scrollId);
      setItems((prev) => [...prev, ...res.items]);
      setScrollId(res.scrollId);
    } catch {
      toast.error('No se pudo cargar más productos');
    } finally {
      setLoadingMore(false);
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_SELECTION) {
          toast.error(`Máximo ${MAX_SELECTION} productos por importación`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    const importable = items.filter((i) => !i.alreadyImported);
    const limit = Math.min(importable.length, MAX_SELECTION);
    setSelected(new Set(importable.slice(0, limit).map((i) => i.id)));
  };

  const start = async () => {
    if (selected.size === 0) {
      toast.error('Elegí al menos un producto');
      return;
    }
    setSubmitting(true);
    try {
      const res = await mercadolibre.startImport(Array.from(selected));
      toast.success(`Importación iniciada (${res.totalItems} productos)`);
      setSelected(new Set());
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'No se pudo iniciar la importación';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-tradealo-text-muted mt-6">Cargando…</p>;
  }

  if (items.length === 0) {
    return (
      <Card className="mt-6">
        <CardBody className="py-8 text-center text-sm text-tradealo-text-muted">
          No encontramos productos activos en tu cuenta de MercadoLibre.
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-tradealo-text-muted">
          {selected.size} seleccionado{selected.size === 1 ? '' : 's'} ·{' '}
          {items.filter((i) => !i.alreadyImported).length} importables
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={selectAll}>
            Seleccionar todo
          </Button>
          <Button
            size="sm"
            onClick={start}
            loading={submitting}
            disabled={selected.size === 0}
          >
            Importar seleccionados ({selected.size})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            checked={selected.has(item.id)}
            onToggle={() => toggle(item.id)}
          />
        ))}
      </div>

      {scrollId && (
        <div className="text-center">
          <Button
            size="sm"
            variant="secondary"
            onClick={loadMore}
            loading={loadingMore}
          >
            Cargar más
          </Button>
        </div>
      )}
    </div>
  );
}

function ItemCard({
  item,
  checked,
  onToggle,
}: {
  item: MlItemRow;
  checked: boolean;
  onToggle: () => void;
}) {
  const disabled = item.alreadyImported;
  return (
    <label
      className={`flex gap-3 p-3 rounded-xl border ${
        checked
          ? 'border-tradealo-primary bg-tradealo-primary/5'
          : 'border-tradealo-border bg-white'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        className="mt-1"
      />
      {item.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnail}
          alt={item.title}
          className="w-16 h-16 rounded-lg object-cover bg-gray-100"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-gray-100" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-tradealo-text line-clamp-2">
          {item.title}
        </p>
        <p className="text-xs text-tradealo-text-muted mt-0.5">
          {item.currency} {item.price.toLocaleString('es-AR')}
        </p>
        {disabled && (
          <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-gray-100 text-tradealo-text-muted">
            Ya importado
          </span>
        )}
      </div>
    </label>
  );
}

function JobsTab() {
  const [jobs, setJobs] = useState<MlImportJob[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      const res = await mercadolibre.listJobs();
      setJobs(res.data);
    } catch {
      toast.error('No se pudieron cargar las importaciones');
    }
  };

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const anyInFlight = jobs.some(
      (j) => j.status === 'queued' || j.status === 'running',
    );
    if (!anyInFlight) return;
    const interval = setInterval(() => {
      void reload();
    }, 3000);
    return () => clearInterval(interval);
  }, [jobs]);

  if (loading) {
    return <p className="text-sm text-tradealo-text-muted mt-6">Cargando…</p>;
  }

  if (jobs.length === 0) {
    return (
      <Card className="mt-6">
        <CardBody className="py-8 text-center text-sm text-tradealo-text-muted">
          Todavía no iniciaste ninguna importación.
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-3 mt-4">
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={reload}>
          <RefreshCw size={14} className="mr-1" /> Refrescar
        </Button>
      </div>
      {jobs.map((job) => (
        <JobRow key={job.id} job={job} />
      ))}
    </div>
  );
}

function JobRow({ job }: { job: MlImportJob }) {
  const percent =
    job.totalItems === 0
      ? 0
      : Math.round(
          ((job.succeeded + job.failed + job.skippedDuplicate) /
            job.totalItems) *
            100,
        );
  const statusLabel: Record<MlImportJob['status'], string> = {
    queued: 'En cola',
    running: 'Procesando',
    completed: 'Completada',
    failed: 'Falló',
  };
  return (
    <Card>
      <CardBody className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-tradealo-text">
            Importación de {job.totalItems} productos
          </p>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              job.status === 'completed'
                ? 'bg-emerald-50 text-emerald-700'
                : job.status === 'failed'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-gray-100 text-tradealo-text-muted'
            }`}
          >
            {statusLabel[job.status]}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-tradealo-primary transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-tradealo-text-muted">
          <span>
            ✓ {job.succeeded} · ✗ {job.failed} · ⟳ {job.skippedDuplicate}{' '}
            duplicados
          </span>
          <span>
            {new Date(job.createdAt).toLocaleString('es-AR', {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </span>
        </div>
        {job.status === 'completed' && job.succeeded > 0 && (
          <Link
            href="/my-listings?status=draft"
            className="text-xs text-tradealo-primary hover:underline"
          >
            Ver borradores →
          </Link>
        )}
        {job.errorMessage && (
          <p className="text-xs text-red-600">{job.errorMessage}</p>
        )}
      </CardBody>
    </Card>
  );
}
