'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { admin, type TicketMessage } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { toast } from '@/lib/store';

type TicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

const statusVariant = (s: TicketStatus): 'warning' | 'default' | 'success' | 'danger' => {
  if (s === 'open') return 'warning';
  if (s === 'in_progress' || s === 'waiting_user') return 'default';
  if (s === 'resolved') return 'success';
  return 'danger';
};

const statusLabel: Record<TicketStatus, string> = {
  open: 'Abierto',
  in_progress: 'En progreso',
  waiting_user: 'Esperando usuario',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};

const priorityVariant = (p: TicketPriority): 'default' | 'warning' | 'danger' => {
  if (p === 'low') return 'default';
  if (p === 'medium') return 'warning';
  return 'danger';
};

const priorityLabel: Record<TicketPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

const categoryLabel: Record<string, string> = {
  account: 'Cuenta',
  billing: 'Facturación',
  listing: 'Publicación',
  technical: 'Técnico',
  other: 'Otro',
};

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['admin-ticket', id],
    queryFn: () => admin.getTicket(id),
    staleTime: 30_000,
  });

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await admin.addTicketMessage(id, reply.trim());
      toast.success('Respuesta enviada');
      setReply('');
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', id] });
    } catch {
      toast.error('Error al enviar respuesta');
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (status: TicketStatus) => {
    setUpdatingStatus(true);
    try {
      await admin.updateTicket(id, { status });
      toast.success('Estado actualizado');
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
    } catch {
      toast.error('Error al actualizar estado');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const changePriority = async (priority: TicketPriority) => {
    setUpdatingPriority(true);
    try {
      await admin.updateTicket(id, { priority });
      toast.success('Prioridad actualizada');
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
    } catch {
      toast.error('Error al actualizar prioridad');
    } finally {
      setUpdatingPriority(false);
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

  if (!ticket) {
    return (
      <div className="text-center py-20 text-tradealo-text-muted text-sm">
        Ticket no encontrado.
      </div>
    );
  }

  const isActive = ticket.status !== 'resolved' && ticket.status !== 'closed';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/tickets" className="text-tradealo-text-muted hover:text-tradealo-text">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-heading text-2xl font-bold text-tradealo-text truncate">
          {ticket.subject}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: ticket info + controls */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardBody className="space-y-4">
              <div>
                <p className="text-xs text-tradealo-text-muted font-medium uppercase tracking-wide mb-1">Estado</p>
                <Badge variant={statusVariant(ticket.status)} size="sm">
                  {statusLabel[ticket.status]}
                </Badge>
              </div>

              <div>
                <p className="text-xs text-tradealo-text-muted font-medium uppercase tracking-wide mb-1">Prioridad</p>
                <Badge variant={priorityVariant(ticket.priority)} size="sm">
                  {priorityLabel[ticket.priority]}
                </Badge>
              </div>

              <div>
                <p className="text-xs text-tradealo-text-muted font-medium uppercase tracking-wide mb-1">Categoría</p>
                <p className="text-sm text-tradealo-text">{categoryLabel[ticket.category] ?? ticket.category}</p>
              </div>

              <div>
                <p className="text-xs text-tradealo-text-muted font-medium uppercase tracking-wide mb-1">Usuario</p>
                <p className="text-sm font-mono text-tradealo-text">
                  {ticket.userEmail ?? ticket.userId.slice(0, 8) + '…'}
                </p>
              </div>

              <div>
                <p className="text-xs text-tradealo-text-muted font-medium uppercase tracking-wide mb-1">Creado</p>
                <p className="text-sm text-tradealo-text-muted"><RelativeTime iso={ticket.createdAt} /></p>
              </div>

              {isActive && (
                <div className="space-y-3 pt-2 border-t border-tradealo-border">
                  <div>
                    <label className="block text-xs text-tradealo-text-muted font-medium uppercase tracking-wide mb-1.5">
                      Cambiar estado
                    </label>
                    <select
                      defaultValue={ticket.status}
                      disabled={updatingStatus}
                      onChange={(e) => changeStatus(e.target.value as TicketStatus)}
                      className="w-full rounded-lg border border-tradealo-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary disabled:opacity-50"
                    >
                      <option value="open">Abierto</option>
                      <option value="in_progress">En progreso</option>
                      <option value="waiting_user">Esperando usuario</option>
                      <option value="resolved">Resuelto</option>
                      <option value="closed">Cerrado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-tradealo-text-muted font-medium uppercase tracking-wide mb-1.5">
                      Cambiar prioridad
                    </label>
                    <select
                      defaultValue={ticket.priority}
                      disabled={updatingPriority}
                      onChange={(e) => changePriority(e.target.value as TicketPriority)}
                      className="w-full rounded-lg border border-tradealo-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary disabled:opacity-50"
                    >
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right: message thread */}
        <div className="lg:col-span-2">
          <Card>
            <CardBody className="flex flex-col gap-4">
              <h2 className="font-medium text-tradealo-text text-sm">Mensajes</h2>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {!ticket.messages?.length ? (
                  <p className="text-sm text-tradealo-text-muted text-center py-8">Sin mensajes aún.</p>
                ) : (
                  ticket.messages.map((msg: TicketMessage) => (
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

              {isActive && (
                <div className="flex gap-2 pt-3 border-t border-tradealo-border">
                  <textarea
                    className="flex-1 rounded-lg border border-tradealo-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary resize-none"
                    rows={2}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Escribí una respuesta…"
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
    </div>
  );
}
