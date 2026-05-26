'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { admin } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { toast } from '@/lib/store';
import { RelativeTime } from '@/components/ui/RelativeTime';

export default function AdminKycPage() {
  const queryClient = useQueryClient();
  const [rejectUserId, setRejectUserId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-kyc-pending'],
    queryFn: () => admin.getKycPending(),
    staleTime: 60_000,
  });

  const approveKyc = async (verificationId: string) => {
    try {
      await admin.approveKyc(verificationId, 1);
      toast.success('Verificación aprobada');
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-pending'] });
    } catch {
      toast.error('Error al aprobar');
    }
  };

  const rejectKyc = async () => {
    if (!rejectUserId) return;
    try {
      await admin.rejectKyc(rejectUserId, rejectReason);
      toast.success('Verificación rechazada');
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-pending'] });
    } catch {
      toast.error('Error al rechazar');
    } finally {
      setRejectUserId(null);
      setRejectReason('');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-tradealo-text">
        KYC pendientes
      </h1>

      <Card>
        <CardBody>
          {isLoading ? (
            <Skeleton variant="card" className="h-64" />
          ) : !data?.data?.length ? (
            <div className="text-center py-12">
              <ShieldCheck
                size={40}
                className="mx-auto text-tradealo-success mb-3"
              />
              <p className="text-sm text-tradealo-text-muted">
                No hay verificaciones KYC pendientes.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[540px]">
                <thead>
                  <tr className="border-b border-tradealo-border text-left text-tradealo-text-muted text-xs">
                    <th className="pb-2 font-medium">Usuario</th>
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Tipo</th>
                    <th className="pb-2 font-medium">Nivel actual</th>
                    <th className="pb-2 font-medium">Registro</th>
                    <th className="pb-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-tradealo-border last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={u.avatarUrl}
                            username={u.username ?? u.email}
                            size="sm"
                          />
                          <span className="font-medium text-tradealo-text">
                            {u.username ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-tradealo-text-muted">
                        {u.email}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="default" size="sm">
                          {u.type === 'phone_camera' ? 'Cámara' : u.type === 'selfie' ? 'Selfie' : u.type === 'id' ? 'DNI' : u.type}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="warning" size="sm">
                          Nivel {u.kycLevel}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-tradealo-text-muted whitespace-nowrap">
                        {u.createdAt ? <RelativeTime iso={u.createdAt} /> : '—'}
                      </td>
                      <td className="py-3">
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
                            onClick={() => {
                              setRejectUserId(u.id);
                              setRejectReason('');
                            }}
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

      {/* Reject modal */}
      <Modal
        open={!!rejectUserId}
        onClose={() => {
          setRejectUserId(null);
          setRejectReason('');
        }}
        title="Rechazar KYC"
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
              placeholder="Explica por qué se rechaza esta verificación…"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setRejectUserId(null);
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
