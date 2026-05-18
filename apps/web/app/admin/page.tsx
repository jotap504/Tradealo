'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  UserCheck,
  Tag,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { admin } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import { RelativeTime } from '@/components/ui/RelativeTime';

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [rejectListingId, setRejectListingId] = useState<string | null>(null);
  const [rejectKycUserId, setRejectKycUserId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => admin.getStats(),
    staleTime: 60_000,
  });

  const { data: pendingListings, isLoading: loadingListings } = useQuery({
    queryKey: ['admin-pending-listings'],
    queryFn: () => admin.getModerationListings(),
    staleTime: 60_000,
  });

  const { data: pendingKyc, isLoading: loadingKyc } = useQuery({
    queryKey: ['admin-pending-kyc'],
    queryFn: () => admin.getKycPending(),
    staleTime: 60_000,
  });

  const approveListing = async (id: string) => {
    try {
      await admin.approveListing(id);
      toast.success('Listing aprobado');
      queryClient.invalidateQueries({ queryKey: ['admin-pending-listings'] });
    } catch {
      toast.error('Error al aprobar');
    }
  };

  const rejectListing = async () => {
    if (!rejectListingId) return;
    try {
      await admin.rejectListing(rejectListingId, rejectReason);
      toast.success('Listing rechazado');
      queryClient.invalidateQueries({ queryKey: ['admin-pending-listings'] });
    } catch {
      toast.error('Error al rechazar');
    } finally {
      setRejectListingId(null);
      setRejectReason('');
    }
  };

  const approveKyc = async (userId: string) => {
    try {
      await admin.approveKyc(userId, 2);
      toast.success('KYC aprobado');
      queryClient.invalidateQueries({ queryKey: ['admin-pending-kyc'] });
    } catch {
      toast.error('Error al aprobar KYC');
    }
  };

  const rejectKyc = async () => {
    if (!rejectKycUserId) return;
    try {
      await admin.rejectKyc(rejectKycUserId, rejectReason);
      toast.success('KYC rechazado');
      queryClient.invalidateQueries({ queryKey: ['admin-pending-kyc'] });
    } catch {
      toast.error('Error al rechazar KYC');
    } finally {
      setRejectKycUserId(null);
      setRejectReason('');
    }
  };

  const STAT_CARDS = [
    {
      label: 'Usuarios totales',
      value: stats?.totalUsers ?? 0,
      display: (v: number | string) =>
        typeof v === 'number' ? v.toLocaleString('es-AR') : v,
      icon: UserCheck,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Listings activos',
      value: stats?.activeListings ?? 0,
      display: (v: number | string) =>
        typeof v === 'number' ? v.toLocaleString('es-AR') : v,
      icon: Tag,
      color: 'text-tradealo-primary bg-tradealo-primary-light',
    },
    {
      label: 'KYC pendientes',
      value: pendingKyc?.data?.length ?? 0,
      display: (v: number | string) =>
        typeof v === 'number' ? v.toLocaleString('es-AR') : v,
      icon: Clock,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Revenue del mes',
      value: formatPrice(stats?.revenueArs ?? 0, 'ARS'),
      display: (v: number | string) => String(v),
      icon: DollarSign,
      color: 'text-tradealo-success bg-green-50',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-tradealo-text">
        Dashboard CEO
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingStats
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="card" className="h-24" />
            ))
          : STAT_CARDS.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label}>
                  <CardBody className="flex items-center gap-3 p-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-tradealo-text-muted">
                        {s.label}
                      </p>
                      <p className="font-heading font-bold text-xl text-tradealo-text">
                        {s.display(s.value)}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
      </div>

      {/* Pending listings */}
      <Card>
        <CardBody>
          <h2 className="font-heading font-semibold text-base mb-4">
            Listings pendientes de moderación
          </h2>
          {loadingListings ? (
            <Skeleton variant="card" className="h-40" />
          ) : !pendingListings?.data?.length ? (
            <p className="text-sm text-tradealo-text-muted">
              No hay listings pendientes.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-tradealo-border text-left text-tradealo-text-muted text-xs">
                    <th className="pb-2 font-medium">Título</th>
                    <th className="pb-2 font-medium">Vendedor</th>
                    <th className="pb-2 font-medium">Fecha</th>
                    <th className="pb-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingListings.data.slice(0, 5).map((l) => (
                    <tr
                      key={l.id}
                      className="border-b border-tradealo-border last:border-0"
                    >
                      <td className="py-2.5 pr-4 max-w-[180px] truncate font-medium">
                        {l.title}
                      </td>
                      <td className="py-2.5 pr-4 text-tradealo-text-muted">
                        {l.seller?.username ?? '—'}
                      </td>
                      <td className="py-2.5 pr-4 text-tradealo-text-muted whitespace-nowrap">
                        <RelativeTime iso={l.createdAt} />
                      </td>
                      <td className="py-2.5">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            leftIcon={<CheckCircle2 size={13} />}
                            onClick={() => approveListing(l.id)}
                          >
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            leftIcon={<XCircle size={13} />}
                            onClick={() => setRejectListingId(l.id)}
                          >
                            Rechazar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pending KYC */}
      <Card>
        <CardBody>
          <h2 className="font-heading font-semibold text-base mb-4">
            KYC pendientes
          </h2>
          {loadingKyc ? (
            <Skeleton variant="card" className="h-40" />
          ) : !pendingKyc?.data?.length ? (
            <p className="text-sm text-tradealo-text-muted">
              No hay KYC pendientes.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-tradealo-border text-left text-tradealo-text-muted text-xs">
                    <th className="pb-2 font-medium">Usuario</th>
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Nivel</th>
                    <th className="pb-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingKyc.data.slice(0, 5).map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-tradealo-border last:border-0"
                    >
                      <td className="py-2.5 pr-4 font-medium">
                        {u.username ?? '—'}
                      </td>
                      <td className="py-2.5 pr-4 text-tradealo-text-muted">
                        {u.email}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge variant="warning" size="sm">
                          Nivel {u.kycLevel}
                        </Badge>
                      </td>
                      <td className="py-2.5">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            leftIcon={<CheckCircle2 size={13} />}
                            onClick={() => approveKyc(u.id)}
                          >
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            leftIcon={<XCircle size={13} />}
                            onClick={() => setRejectKycUserId(u.id)}
                          >
                            Rechazar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modals */}
      <Modal
        open={!!rejectListingId}
        onClose={() => {
          setRejectListingId(null);
          setRejectReason('');
        }}
        title="Rechazar listing"
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
                setRejectListingId(null);
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

      <Modal
        open={!!rejectKycUserId}
        onClose={() => {
          setRejectKycUserId(null);
          setRejectReason('');
        }}
        title="Rechazar KYC"
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
              placeholder="Explica por qué se rechaza esta verificación…"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setRejectKycUserId(null);
                setRejectReason('');
              }}
            >
              Cancelar
            </Button>
            <Button variant="danger" fullWidth onClick={rejectKyc}>
              Confirmar rechazo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
