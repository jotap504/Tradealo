'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Eye,
  Tag,
  AlertTriangle,
} from 'lucide-react';
import { admin } from '@/lib/api';
import { type Listing } from '@/types';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import { RelativeTime } from '@/components/ui/RelativeTime';

function RiskBadge({ score }: { score: number | undefined }) {
  if (score === undefined || score === null) return null;
  if (score >= 70) {
    return (
      <Badge variant="danger" size="sm">
        <AlertTriangle size={11} className="inline mr-1" />
        {score}
      </Badge>
    );
  }
  if (score >= 40) {
    return (
      <Badge variant="warning" size="sm">
        {score}
      </Badge>
    );
  }
  return (
    <Badge variant="success" size="sm">
      {score}
    </Badge>
  );
}

export default function AdminListingsPage() {
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [drawerListing, setDrawerListing] = useState<Listing | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-moderation-listings', cursor],
    queryFn: () => admin.getModerationListings(cursor ? { cursor } : {}),
    staleTime: 60_000,
  });

  const approveListing = async (id: string) => {
    try {
      await admin.approveListing(id);
      toast.success('Listing aprobado');
      queryClient.invalidateQueries({ queryKey: ['admin-moderation-listings'] });
    } catch {
      toast.error('Error al aprobar');
    }
  };

  const rejectListing = async () => {
    if (!rejectId) return;
    try {
      await admin.rejectListing(rejectId, rejectReason);
      toast.success('Listing rechazado');
      queryClient.invalidateQueries({ queryKey: ['admin-moderation-listings'] });
    } catch {
      toast.error('Error al rechazar');
    } finally {
      setRejectId(null);
      setRejectReason('');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-tradealo-text">
        Moderación de listings
      </h1>

      <Card>
        <CardBody>
          {isLoading ? (
            <Skeleton variant="card" className="h-64" />
          ) : !data?.data?.length ? (
            <div className="text-center py-12">
              <Tag size={40} className="mx-auto text-tradealo-text-muted mb-3" />
              <p className="text-sm text-tradealo-text-muted">
                No hay listings pendientes de moderación.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-tradealo-border text-left text-tradealo-text-muted text-xs">
                      <th className="pb-2 font-medium">Imagen</th>
                      <th className="pb-2 font-medium">Título</th>
                      <th className="pb-2 font-medium">Vendedor</th>
                      <th className="pb-2 font-medium">Precio</th>
                      <th className="pb-2 font-medium">Riesgo</th>
                      <th className="pb-2 font-medium">Fecha</th>
                      <th className="pb-2 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((l) => (
                      <tr
                        key={l.id}
                        className="border-b border-tradealo-border last:border-0"
                      >
                        <td className="py-3 pr-3">
                          {l.images?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={l.images[0].url}
                              alt={l.title}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Tag size={16} className="text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4 max-w-[160px]">
                          <p className="font-medium text-tradealo-text truncate">
                            {l.title}
                          </p>
                          <p className="text-xs text-tradealo-text-muted mt-0.5">
                            {l.category?.name ?? '—'}
                          </p>
                        </td>
                        <td className="py-3 pr-4 text-tradealo-text-muted">
                          {l.seller?.username ?? '—'}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap font-medium">
                          {formatPrice(l.price, l.currency)}
                        </td>
                        <td className="py-3 pr-4">
                          <RiskBadge score={l.riskScore} />
                        </td>
                        <td className="py-3 pr-4 text-tradealo-text-muted whitespace-nowrap">
                          <RelativeTime iso={l.createdAt} />
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              leftIcon={<Eye size={13} />}
                              onClick={() => setDrawerListing(l)}
                            >
                              Ver
                            </Button>
                            <Button
                              size="sm"
                              leftIcon={<CheckCircle2 size={13} />}
                              onClick={() => approveListing(l.id)}
                            >
                              OK
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              leftIcon={<XCircle size={13} />}
                              onClick={() => {
                                setRejectId(l.id);
                                setRejectReason('');
                              }}
                            >
                              No
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {(cursor || data.nextCursor) && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-tradealo-border">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!cursor}
                    onClick={() => setCursor(undefined)}
                  >
                    Primera página
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!data.nextCursor}
                    onClick={() => setCursor(data.nextCursor)}
                  >
                    Siguiente →
                  </Button>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* Reject modal */}
      <Modal
        open={!!rejectId}
        onClose={() => {
          setRejectId(null);
          setRejectReason('');
        }}
        title="Rechazar listing"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-tradealo-text mb-1.5">
              Razón del rechazo
            </label>
            <textarea
              className="w-full rounded-lg border border-tradealo-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary resize-none"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explica por qué se rechaza este listing…"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setRejectId(null);
                setRejectReason('');
              }}
            >
              Cancelar
            </Button>
            <Button variant="danger" fullWidth onClick={rejectListing}>
              Confirmar rechazo
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal
        open={!!drawerListing}
        onClose={() => setDrawerListing(null)}
        title={drawerListing?.title ?? 'Detalle del listing'}
        size="lg"
      >
        {drawerListing && (
          <div className="space-y-4">
            {drawerListing.images?.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {drawerListing.images.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.id}
                    src={img.url}
                    alt={drawerListing.title}
                    className="h-32 w-32 rounded-lg object-cover shrink-0"
                  />
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-tradealo-text-muted text-xs">Vendedor</p>
                <p className="font-medium">{drawerListing.seller?.username ?? '—'}</p>
              </div>
              <div>
                <p className="text-tradealo-text-muted text-xs">Precio</p>
                <p className="font-medium">
                  {formatPrice(drawerListing.price, drawerListing.currency)}
                </p>
              </div>
              <div>
                <p className="text-tradealo-text-muted text-xs">Categoría</p>
                <p className="font-medium">{drawerListing.category?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-tradealo-text-muted text-xs">Condición</p>
                <p className="font-medium">{drawerListing.condition}</p>
              </div>
              <div>
                <p className="text-tradealo-text-muted text-xs">Provincia</p>
                <p className="font-medium">{drawerListing.province}</p>
              </div>
              <div>
                <p className="text-tradealo-text-muted text-xs">Riesgo</p>
                <RiskBadge score={drawerListing.riskScore} />
              </div>
            </div>
            {drawerListing.description && (
              <div>
                <p className="text-tradealo-text-muted text-xs mb-1">Descripción</p>
                <p className="text-sm text-tradealo-text whitespace-pre-line">
                  {drawerListing.description}
                </p>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                fullWidth
                leftIcon={<CheckCircle2 size={14} />}
                onClick={() => {
                  approveListing(drawerListing.id);
                  setDrawerListing(null);
                }}
              >
                Aprobar
              </Button>
              <Button
                fullWidth
                variant="danger"
                leftIcon={<XCircle size={14} />}
                onClick={() => {
                  setDrawerListing(null);
                  setRejectId(drawerListing.id);
                  setRejectReason('');
                }}
              >
                Rechazar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
