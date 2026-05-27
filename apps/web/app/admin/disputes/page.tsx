'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Swords } from 'lucide-react';
import Link from 'next/link';
import { admin, type AdminDispute } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { RelativeTime } from '@/components/ui/RelativeTime';

type StatusFilter = '' | 'open' | 'in_review' | 'resolved' | 'closed';

const statusVariant = (s: AdminDispute['status']): 'warning' | 'default' | 'success' | 'danger' => {
  if (s === 'open') return 'warning';
  if (s === 'in_review') return 'default';
  if (s === 'resolved') return 'success';
  return 'danger';
};

const statusLabel: Record<AdminDispute['status'], string> = {
  open: 'Abierta',
  in_review: 'En revisión',
  resolved: 'Resuelta',
  closed: 'Cerrada',
};

export default function AdminDisputesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const params = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(cursor ? { cursor } : {}),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-disputes', statusFilter, cursor],
    queryFn: () => admin.getDisputes(params),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-tradealo-text">Disputas</h1>

      {/* Filters */}
      <Card>
        <CardBody className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-tradealo-text-muted whitespace-nowrap">
              Estado:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setCursor(undefined); }}
              className="rounded-lg border border-tradealo-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary"
            >
              <option value="">Todos</option>
              <option value="open">Abierta</option>
              <option value="in_review">En revisión</option>
              <option value="resolved">Resuelta</option>
              <option value="closed">Cerrada</option>
            </select>
          </div>

          {statusFilter && (
            <Button size="sm" variant="ghost" onClick={() => { setStatusFilter(''); setCursor(undefined); }}>
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
              <Swords size={40} className="mx-auto text-tradealo-text-muted mb-3" />
              <p className="text-sm text-tradealo-text-muted">No hay disputas</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="border-b border-tradealo-border text-left text-tradealo-text-muted text-xs">
                      <th className="pb-2 font-medium">Fecha</th>
                      <th className="pb-2 font-medium">Iniciador</th>
                      <th className="pb-2 font-medium">Asunto</th>
                      <th className="pb-2 font-medium">Estado</th>
                      <th className="pb-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((d: AdminDispute) => (
                      <tr key={d.id} className="border-b border-tradealo-border last:border-0">
                        <td className="py-3 pr-4 text-tradealo-text-muted whitespace-nowrap">
                          <RelativeTime iso={d.createdAt} />
                        </td>
                        <td className="py-3 pr-4 text-xs text-tradealo-text-muted truncate max-w-[180px]">
                          {d.initiatorEmail ?? d.initiatorId.slice(0, 8) + '…'}
                        </td>
                        <td className="py-3 pr-4 text-tradealo-text max-w-[280px] truncate">
                          {d.subject.length > 50 ? d.subject.slice(0, 50) + '…' : d.subject}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge size="sm" variant={statusVariant(d.status)}>
                            {statusLabel[d.status]}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Link
                            href={`/admin/disputes/${d.id}`}
                            className="text-sm font-medium text-tradealo-primary hover:underline"
                          >
                            Ver
                          </Link>
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
