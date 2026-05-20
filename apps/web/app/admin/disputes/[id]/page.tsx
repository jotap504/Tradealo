'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { admin, type DisputeMessage } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { toast } from '@/lib/store';

type DisputeStatus = 'open' | 'in_review' | 'resolved' | 'closed';

const statusVariant = (s: DisputeStatus): 'warning' | 'default' | 'success' | 'danger' => {
  if (s === 'open') return 'warning';
  if (s === 'in_review') return 'default';
  if (s === 'resolved') return 'success';
  return 'danger';
};

const statusLabel: Record<DisputeStatus, string> = {
  open: 'Abierta',
  in_review: 'En revisión',
  resolved: 'Resuelta',
  closed: 'Cerrada',
};

export default function AdminDisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [actionModal, setActionModal] = useState<'resolve' | 'close' | null>(null);
  const [resolution, setResolution] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: dispute, isLoading } = useQuery({
    queryKey: ['admin-dispute', id],
    queryFn: () => admin.getDispute(id),
    staleTime: 30_000,
  });

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await admin.addDisputeMessage(id, reply.trim());
      toast.success('Mensaje enviado');
      setReply('');
      queryClient.invalidateQueries({ queryKey: ['admin-dispute', id] });
    } catch {
      toast.error('Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleAction = async () => {
    if (!actionModal) return;
    setSubmitting(true);
    try {
      if (actionModal === 'resolve') {
        await admin.resolveDispute(id, resolution);
        toast.success('Disputa resuelta');
      } else {
        await admin.closeDispute(id, resolution);
        toast.success('Disputa cerrada');
      }
      queryClient.invalidateQueries({ queryKey: ['admin-dispute', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
      setActionModal(null);
      setResolution('');
    } catch {
      toast.error('Error al procesar la disputa');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async () => {
    try {
      await admin.assignDispute(id);
      toast.success('Disputa asignada');
      queryClient.invalidateQueries({ queryKey: ['admin-dispute', id] });
    } catch {
      toast.error('Error al asignar');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="card" className="h-8 w-48" />
        <Skeleton variant="card" className="h-96" />
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="text-center py-20 text-tradealo-text-muted text-sm">
        Disputa no encontrada.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/disputes" className="text-tradealo-text-muted hover:text-tradealo-text">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-heading text-2xl font-bold text-tradealo-text truncate">
          {dispute.subject}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: dispute info */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardBody className="space-y-4">
              <div>
                <p className="text-xs text-tradealo-text-muted font-medium uppercase tracking-wide mb-1">Estado</p>
                <Badge variant={statusVariant(dispute.status)} size="sm">
                  {statusLabel[dispute.status]}
                </Badge>
              </div>

              <div>
                <p className="text-xs text-tradealo-text-muted font-medium uppercase tracking-wide mb-1">Iniciador</p>
                <p className="text-sm font-mono text-tradealo-text">{dispute.initiatorId.slice(0, 8)}…</p>
              </div>

              <div>
                <p className="text-xs text-tradealo-text-muted font-medium uppercase tracking-wide mb-1">Demandado</p>
                <p className="text-sm font-mono text-tradealo-text">{dispute.respondentId.slice(0, 8)}…</p>
              </div>

              <div>
                <p className="text-xs text-tradealo-text-muted font-medium uppercase tracking-wide mb-1">Descripción</p>
                <p className="text-sm text-tradealo-text">{dispute.description}</p>
              </div>

              <div>
                <p className="text-xs text-tradealo-text-muted font-medium uppercase tracking-wide mb-1">Creada</p>
                <p className="text-sm text-tradealo-text-muted"><RelativeTime iso={dispute.createdAt} /></p>
              </div>

              {dispute.resolution && (
                <div>
                  <p className="text-xs text-tradealo-text-muted font-medium uppercase tracking-wide mb-1">Resolución</p>
                  <p className="text-sm text-tradealo-text">{dispute.resolution}</p>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2 border-t border-tradealo-border">
                {(dispute.status === 'open' || dispute.status === 'in_review') && !dispute.assignedTo && (
                  <Button size="sm" variant="secondary" fullWidth onClick={handleAssign}>
                    Asignarme
                  </Button>
                )}
                {(dispute.status === 'open' || dispute.status === 'in_review') && (
                  <>
                    <Button size="sm" fullWidth onClick={() => { setActionModal('resolve'); setResolution(''); }}>
                      Resolver
                    </Button>
                    <Button size="sm" variant="danger" fullWidth onClick={() => { setActionModal('close'); setResolution(''); }}>
                      Cerrar
                    </Button>
                  </>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right: message thread */}
        <div className="lg:col-span-2">
          <Card>
            <CardBody className="flex flex-col gap-4">
              <h2 className="font-medium text-tradealo-text text-sm">Mensajes</h2>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {!dispute.messages?.length ? (
                  <p className="text-sm text-tradealo-text-muted text-center py-8">Sin mensajes aún.</p>
                ) : (
                  dispute.messages.map((msg: DisputeMessage) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.authorType === 'admin' ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`flex-1 rounded-lg px-3 py-2.5 text-sm ${
                        msg.authorType === 'admin'
                          ? 'bg-tradealo-primary/10 text-tradealo-text ml-8'
                          : 'bg-tradealo-border/30 text-tradealo-text mr-8'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge size="sm" variant={msg.authorType === 'admin' ? 'default' : 'warning'}>
                            {msg.authorType === 'admin' ? 'Admin' : 'Usuario'}
                          </Badge>
                          <span className="text-xs text-tradealo-text-muted">
                            <RelativeTime iso={msg.createdAt} />
                          </span>
                        </div>
                        <p>{msg.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {(dispute.status === 'open' || dispute.status === 'in_review') && (
                <div className="flex gap-2 pt-3 border-t border-tradealo-border">
                  <textarea
                    className="flex-1 rounded-lg border border-tradealo-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary resize-none"
                    rows={2}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Escribí un mensaje…"
                  />
                  <Button
                    leftIcon={<Send size={14} />}
                    loading={sending}
                    onClick={sendReply}
                    disabled={!reply.trim()}
                  >
                    Enviar
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Action modal */}
      <Modal
        open={!!actionModal}
        onClose={() => { setActionModal(null); setResolution(''); }}
        title={actionModal === 'resolve' ? 'Resolver disputa' : 'Cerrar disputa'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-tradealo-text mb-1.5">Resolución</label>
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
              variant={actionModal === 'close' ? 'danger' : 'primary'}
              loading={submitting}
              onClick={handleAction}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
