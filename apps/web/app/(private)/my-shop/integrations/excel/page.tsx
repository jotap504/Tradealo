'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileSpreadsheet, Upload } from 'lucide-react';
import {
  excelImport,
  type ExcelPreview,
  type ExcelColumnMapping,
  type ExcelTrocaliaField,
  type MlImportJob,
  type MlImportJobItem,
} from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/lib/store';

const FIELD_LABEL: Record<ExcelTrocaliaField, string> = {
  title: 'Título',
  description: 'Descripción',
  price: 'Precio',
  currency: 'Moneda',
  condition: 'Condición',
  categoryHint: 'Categoría (texto)',
  imagesUrls: 'Imágenes (URLs)',
  sku: 'SKU',
  stock: 'Stock',
  ignore: '— Ignorar —',
};
const FIELDS: ExcelTrocaliaField[] = [
  'title',
  'description',
  'price',
  'currency',
  'condition',
  'categoryHint',
  'imagesUrls',
  'sku',
  'stock',
  'ignore',
];

export default function ExcelImportPage() {
  const [preview, setPreview] = useState<ExcelPreview | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/my-shop/integrations"
          className="text-tradealo-text-muted hover:text-tradealo-text"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-tradealo-text">
              Importar desde Excel
            </h1>
            <p className="text-sm text-tradealo-text-muted">
              Subí tu planilla. La IA detecta las columnas, vos confirmás, y los
              productos quedan como borradores.
            </p>
          </div>
        </div>
      </div>

      {jobId ? (
        <Progress
          jobId={jobId}
          onReset={() => {
            setJobId(null);
            setPreview(null);
          }}
        />
      ) : preview ? (
        <MappingStep
          preview={preview}
          onCancel={() => setPreview(null)}
          onConfirmed={(id) => setJobId(id)}
        />
      ) : (
        <UploadStep onPreview={setPreview} />
      )}
    </div>
  );
}

function UploadStep({ onPreview }: { onPreview: (p: ExcelPreview) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Archivo demasiado grande (máx 5 MB)');
      return;
    }
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const base64 = toBase64(buf);
      const res = await excelImport.preview(file.name, base64);
      onPreview(res);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'No se pudo procesar el archivo';
      toast.error(typeof msg === 'string' ? msg : 'Error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardBody className="py-10 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
          <Upload size={26} />
        </div>
        <div>
          <p className="font-heading font-semibold text-tradealo-text">
            Subí tu Excel (.xlsx, .xls) o CSV
          </p>
          <p className="text-sm text-tradealo-text-muted mt-1">
            Hasta 200 productos, 5 MB máximo. Solo lee la primera hoja.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = '';
          }}
        />
        <Button
          onClick={() => inputRef.current?.click()}
          loading={uploading}
          size="sm"
        >
          Elegir archivo
        </Button>
      </CardBody>
    </Card>
  );
}

function MappingStep({
  preview,
  onCancel,
  onConfirmed,
}: {
  preview: ExcelPreview;
  onCancel: () => void;
  onConfirmed: (jobId: string) => void;
}) {
  const [mapping, setMapping] = useState<ExcelColumnMapping[]>(preview.mapping);
  const [submitting, setSubmitting] = useState(false);

  const setField = (index: number, field: ExcelTrocaliaField) => {
    setMapping((prev) =>
      prev.map((m) => (m.index === index ? { ...m, field, confidence: 1 } : m)),
    );
  };

  const start = async () => {
    setSubmitting(true);
    try {
      const res = await excelImport.confirm(preview.jobId, mapping);
      toast.success(`Importación iniciada (${res.totalItems} filas)`);
      onConfirmed(preview.jobId);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'No se pudo iniciar';
      toast.error(typeof msg === 'string' ? msg : 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const titleMapped = mapping.some((m) => m.field === 'title');
  const priceMapped = mapping.some((m) => m.field === 'price');

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="space-y-3">
          <p className="text-sm text-tradealo-text">
            Detectamos <strong>{preview.totalRows}</strong> filas y{' '}
            <strong>{preview.headers.length}</strong> columnas. Revisá el mapeo
            antes de continuar.
          </p>
          {(!titleMapped || !priceMapped) && (
            <p className="text-xs text-red-600">
              Falta mapear: {!titleMapped && 'Título'}
              {!titleMapped && !priceMapped && ', '}
              {!priceMapped && 'Precio'}
            </p>
          )}
        </CardBody>
      </Card>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-tradealo-border">
              <th className="text-left py-2 pr-3">Columna del Excel</th>
              <th className="text-left py-2 pr-3">Sample</th>
              <th className="text-left py-2 pr-3">Mapear a</th>
              <th className="text-left py-2 pr-3">Confianza</th>
            </tr>
          </thead>
          <tbody>
            {mapping.map((m) => (
              <tr key={m.index} className="border-b border-tradealo-border">
                <td className="py-2 pr-3 font-medium text-tradealo-text">
                  {m.header || `Columna ${m.index + 1}`}
                </td>
                <td className="py-2 pr-3 text-tradealo-text-muted">
                  {(preview.sampleRows[0]?.[m.index] ?? '') as string}
                </td>
                <td className="py-2 pr-3">
                  <select
                    value={m.field}
                    onChange={(e) =>
                      setField(m.index, e.target.value as ExcelTrocaliaField)
                    }
                    className="h-9 rounded-lg border border-tradealo-border px-2 text-sm"
                  >
                    {FIELDS.map((f) => (
                      <option key={f} value={f}>
                        {FIELD_LABEL[f]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-3 text-xs">
                  <span
                    className={
                      m.confidence >= 0.8
                        ? 'text-emerald-600'
                        : m.confidence >= 0.5
                          ? 'text-amber-600'
                          : 'text-red-600'
                    }
                  >
                    {Math.round(m.confidence * 100)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          onClick={start}
          loading={submitting}
          disabled={!titleMapped || !priceMapped}
          size="sm"
        >
          Iniciar importación
        </Button>
      </div>
    </div>
  );
}

function Progress({
  jobId,
  onReset,
}: {
  jobId: string;
  onReset: () => void;
}) {
  const [job, setJob] = useState<MlImportJob | null>(null);
  const [items, setItems] = useState<MlImportJobItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await excelImport.getJob(jobId);
        if (cancelled) return;
        setJob(res.job);
        setItems(res.items);
      } catch {
        /* ignore */
      }
    };
    void tick();
    const interval = setInterval(() => {
      if (job?.status === 'completed' || job?.status === 'failed') {
        clearInterval(interval);
        return;
      }
      void tick();
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [jobId, job?.status]);

  if (!job) {
    return <p className="text-sm text-tradealo-text-muted">Cargando…</p>;
  }

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
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-tradealo-text">
            Importación de {job.totalItems} filas
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
        <div className="text-xs text-tradealo-text-muted">
          ✓ {job.succeeded} · ✗ {job.failed} · ⟳ {job.skippedDuplicate}{' '}
          duplicados
        </div>
        {job.status === 'completed' && (
          <div className="flex items-center gap-2">
            <Link href="/my-listings?status=draft">
              <Button size="sm">Ver borradores</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={onReset}>
              Importar otra planilla
            </Button>
          </div>
        )}
        {items.some((i) => i.status === 'failed') && (
          <details className="text-xs">
            <summary className="cursor-pointer text-tradealo-text-muted">
              Ver fallos
            </summary>
            <ul className="mt-2 space-y-1">
              {items
                .filter((i) => i.status === 'failed')
                .slice(0, 20)
                .map((i) => (
                  <li key={i.id} className="text-red-600">
                    {i.externalProductId}: {i.errorMessage}
                  </li>
                ))}
            </ul>
          </details>
        )}
      </CardBody>
    </Card>
  );
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunk) as unknown as number[],
    );
  }
  return btoa(binary);
}
