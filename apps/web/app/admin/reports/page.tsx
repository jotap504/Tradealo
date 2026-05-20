'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Flag, ExternalLink } from 'lucide-react';
import { admin, type AdminReport } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { toast } from '@/lib/store';

type StatusFilter = '' | 'open' | 'under_review' | 'resolved' | 'dismissed';
type TargetFilter = '' | 'listing' | 'user';

const statusVariant = (s: AdminReport['status']): 'warning' | 'default' | 'success' | 'danger' => {
  if (s === 'open') return 'warning';
  if (s === 'under_review') return 'default';
  if (s === 'resolved') return 'success';
  return 'danger';
};

const statusLabel: Record<AdminReport['status'], string> = {
  open: 'Abierta',
  under_review: 'En revisión',
  resolved: 'Resuelta',
  dismissed: 'Desestimada',
};

export default function AdminReportsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [targetFilter, setTargetFilter] = useState<TargetFilter>('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const [actionModal, setActionModal] = useState<{ id: string; type: 'resolve' | 'dismiss' } | null>(null);
  const [resolution, setResolution] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const params = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(targetFilter ? { targetType: targetFilter } : {}),
    ...(cursor ? { cursor } : {}),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', statusFilter, targetFilter, cursor],
    queryFn: () => admin.getReports(params),
    staleTime: 30_000,
  });

  const handleAssign = async (id: string) => {
    try {
      await admin.assignReport(id);
      toast.success('Denuncia tomada');
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    } catch {
      toast.error('Error al tomar la denuncia');
    }
  };

  const handleConfirmAction = async () => {
    if (!actionModal) return;
    setSubmitting(true);
    try {
      if (actionModal.type === 'resolve') {
        await admin.resolveReport(actionModal.id, resolution);
        toast.success('Denuncia resuelta');
      } else {
        await admin.dismissReport(actionModal.id, resolution);
        toast.success('Denuncia desestimada');
      }
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      setActionModal(null);
      setResolution('');
    } catch {
      toast.error('Error al procesar la denuncia');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-tradealo-text">Denuncias</h1>

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
              <option value="under_review">En revisión</option>
              <option value="resolved">Resuelta</option>
              <option value="dismissed">Desestimada</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-tradealo-text-muted whitespace-nowrap">
              Tipo:
            </label>
            <select
              value={targetFilter}
              onChange={(e) => { setTargetFilter(e.target.value as TargetFilter); setCursor(undefined); }}
              className="rounded-lg border border-tradealo-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary"
            >
              <option value="">Todos</option>
              <option value="listing">Publicación</option>
              <option value="user">Usuario</option>
            </select>
          </div>

          {(statusFilter || targetFilter) && (
            <Button size="sm" variant="ghost" onClick={() => { setStatusFilter(''); setTargetFilter(''); setCursor(undefined); }}>
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
              <Flag size={40} className="mx-auto text-tradealo-text-muted mb-3" />
              <p className="text-sm text-tradealo-text-muted">No hay denuncias</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b border-tradealo-border text-left text-tradealo-text-muted text-xs">
                      <th className="pb-2 font-medium">Fecha</th>
                      <th className="pb-2 font-medium">Tipo</th>
                      <th className="pb-2 font-medium">Denunciado</th>
                      <th className="pb-2 font-medium">Motivo</th>
                      <th className="pb-2 font-medium">Estado</th>
                      <th className="pb-2 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((r: AdminReport) => (
                      <tr key={r.id} className="border-b border-tradealo-border last:border-0">
                        <td className="py-3 pr-4 text-tradealo-text-muted whitespace-nowrap">
                          <RelativeTime iso={r.createdAt} />
                        </td>
                        <td className="py-3 pr-4">
                          <Badge size="sm" variant="default">
                            {r.targetType === 'listing' ? 'Publicación' : 'Usuario'}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          {r.targetType === 'listing' ? (
                            <Link
                              href={`/listing/${r.targetId}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 text-xs text-tradealo-primary hover:underline"
                            >
                              Ver publicación <ExternalLink size={11} />
                            </Link>
                          ) : (
                            <Link
                              href={`/admin/users/${r.targetId}`}
                              className="inline-flex items-center gap-1 text-xs text-tradealo-primary hover:underline"
                            >
                              Ver usuario <ExternalLink size={11} />
                            </Link>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-tradealo-text max-w-[160px] truncate">
                          {r.reason}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge size="sm" variant={statusVariant(r.status)}>
                            {statusLabel[r.status]}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            {r.status === 'open' && (
                              <Button size="sm" variant="secondary" onClick={() => handleAssign(r.id)}>
                                Tomar
                              </Button>
                            )}
                            {(r.status === 'open' || r.status === 'under_review') && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => { setActionModal({ id: r.id, type: 'resolve' }); setResolution(''); }}
                                >
                                  Resolver
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => { setActionModal({ id: r.id, type: 'dismiss' }); setResolution(''); }}
                                >
                                  Desestimar
                                </Button>
                              </>
                            )}
                          </div>
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

      {/* Resolution modal */}
      <Modal
        open={!!actionModal}
        onClose={() => { setActionModal(null); setResolution(''); }}
        title={actionModal?.type === 'resolve' ? 'Resolver denuncia' : 'Desestimar denuncia'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-tradealo-text mb-1.5">
              {actionModal?.type === 'resolve' ? 'Resolución' : 'Motivo de desestimación'}
            </label>
            <textarea
              className="w-full rounded-lg border border-tradealo-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary resize-none"
              rows={3}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Describí la decisión tomada…"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => { setActionModal(null); setResolution(''); }}>
              Cancelar
            </Button>
            <Button
              fullWidth
              variant={actionModal?.type === 'dismiss' ? 'danger' : 'primary'}
              loading={submitting}
              onClick={handleConfirmAction}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
