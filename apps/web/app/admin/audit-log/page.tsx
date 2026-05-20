'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { admin, type AdminAuditEntry } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { RelativeTime } from '@/components/ui/RelativeTime';

const ENTITY_TYPES = ['all', 'user', 'listing', 'kyc', 'config', 'token_pack'] as const;

export default function AdminAuditLogPage() {
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const params = {
    ...(entityType ? { entityType } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(cursor ? { cursor } : {}),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-log', entityType, from, to, cursor],
    queryFn: () => admin.getAuditLog(params),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-tradealo-text">Audit Log</h1>

      {/* Filters */}
      <Card>
        <CardBody className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-tradealo-text-muted whitespace-nowrap">
              Entidad:
            </label>
            <select
              value={entityType}
              onChange={(e) => { setEntityType(e.target.value === 'all' ? '' : e.target.value); setCursor(undefined); }}
              className="rounded-lg border border-tradealo-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t === 'all' ? '' : t}>
                  {t === 'all' ? 'Todas' : t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-tradealo-text-muted whitespace-nowrap">
              Desde:
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setCursor(undefined); }}
              className="rounded-lg border border-tradealo-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-tradealo-text-muted whitespace-nowrap">
              Hasta:
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setCursor(undefined); }}
              className="rounded-lg border border-tradealo-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary"
            />
          </div>

          {(entityType || from || to) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setEntityType(''); setFrom(''); setTo(''); setCursor(undefined); }}
            >
              Limpiar
            </Button>
          )}
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        <CardBody>
          {isLoading ? (
            <Skeleton variant="card" className="h-64" />
          ) : !data?.data?.length ? (
            <div className="text-center py-12">
              <ShieldCheck size={40} className="mx-auto text-tradealo-text-muted mb-3" />
              <p className="text-sm text-tradealo-text-muted">No hay registros de auditoría</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-tradealo-border text-left text-tradealo-text-muted text-xs">
                      <th className="pb-2 font-medium">Fecha</th>
                      <th className="pb-2 font-medium">Admin</th>
                      <th className="pb-2 font-medium">Acción</th>
                      <th className="pb-2 font-medium">Entidad</th>
                      <th className="pb-2 font-medium">ID afectado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((entry: AdminAuditEntry) => (
                      <tr key={entry.id} className="border-b border-tradealo-border last:border-0">
                        <td className="py-3 pr-4 text-tradealo-text-muted whitespace-nowrap">
                          <RelativeTime iso={entry.createdAt} />
                        </td>
                        <td className="py-3 pr-4 text-tradealo-text font-mono text-xs">
                          {entry.adminEmail ?? entry.adminId.slice(0, 8) + '…'}
                        </td>
                        <td className="py-3 pr-4 text-tradealo-text">{entry.action}</td>
                        <td className="py-3 pr-4 text-tradealo-text-muted">{entry.entityType}</td>
                        <td className="py-3 font-mono text-xs text-tradealo-text-muted">
                          {entry.entityId.slice(0, 8)}…
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data.nextCursor && (
                <div className="mt-4 pt-4 border-t border-tradealo-border flex justify-center">
                  <Button size="sm" variant="secondary" onClick={() => setCursor(data.nextCursor)}>
                    Cargar más
                  </Button>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
