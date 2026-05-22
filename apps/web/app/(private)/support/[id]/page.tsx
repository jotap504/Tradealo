'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { support, type TicketMessage } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { toast } from '@/lib/store';

const STATUS_LABEL: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'En proceso',
  waiting_user: 'Esperando tu respuesta',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  open: 'warning',
  in_progress: 'default',
  waiting_user: 'danger',
  resolved: 'success',
  closed: 'default',
};

const CATEGORY_LABEL: Record<string, string> = {
  account: 'Mi cuenta',
  billing: 'Pagos y tokens',
  listing: 'Publicaciones',
  technical: 'Problema técnico',
  other: 'Otro',
};

export default function SupportTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['my-ticket', id],
    queryFn: () => support.getTicket(id),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await support.addMessage(id, reply.trim());
      setReply('');
      queryClient.invalidateQueries({ queryKey: ['my-ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
    } catch {
      toast.error('No se pudo enviar el mensaje. Intentá de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendReply();
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <Skeleton variant="card" className="h-8 w-48" />
        <Skeleton variant="card" className="h-96" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 text-center">
        <p className="text-sm text-tradealo-text-muted">Ticket no encontrado.</p>
        <Link href="/support" className="text-sm text-tradealo-primary hover:underline mt-2 inline-block">
          Volver al soporte
        </Link>
      </div>
    );
  }

  const isActive = ticket.status !== 'resolved' && ticket.status !== 'closed';

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/support"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-tradealo-text-muted"
          aria-label="Volver"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-xl font-bold text-tradealo-text truncate">
            {ticket.subject}
          </h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge variant={STATUS_VARIANT[ticket.status] ?? 'default'} size="sm">
              {STATUS_LABEL[ticket.status] ?? ticket.status}
            </Badge>
            <span className="text-xs text-tradealo-text-muted">
              {CATEGORY_LABEL[ticket.category] ?? ticket.category}
              {' · '}
              <RelativeTime iso={ticket.createdAt} />
            </span>
          </div>
        </div>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {!ticket.messages?.length ? (
              <p className="text-sm text-tradealo-text-muted text-center py-8">
                Sin mensajes aún.
              </p>
            ) : (
              ticket.messages.map((msg: TicketMessage) => {
                const isAdmin = msg.authorType === 'admin';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        isAdmin
                          ? 'bg-tradealo-primary text-white rounded-tr-none'
                          : 'bg-gray-100 text-tradealo-text rounded-tl-none'
                      }`}
                    >
                      <p className="text-xs font-medium mb-1 opacity-75">
                        {isAdmin ? 'Soporte Trocalia' : 'Vos'}
                      </p>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-xs mt-1.5 opacity-60 ${isAdmin ? 'text-right' : ''}`}>
                        <RelativeTime iso={msg.createdAt} />
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {isActive ? (
            <div className="flex gap-2 pt-3 border-t border-tradealo-border">
              <textarea
                className="flex-1 rounded-xl border border-tradealo-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary resize-none"
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribí tu mensaje… (Ctrl+Enter para enviar)"
              />
              <Button
                leftIcon={<Send size={14} />}
                loading={sending}
                onClick={sendReply}
                disabled={!reply.trim()}
                className="self-end"
              >
                Enviar
              </Button>
            </div>
          ) : (
            <div className="pt-3 border-t border-tradealo-border text-center">
              <p className="text-xs text-tradealo-text-muted">
                Este ticket está {ticket.status === 'resolved' ? 'resuelto' : 'cerrado'}.
                {' '}Si necesitás más ayuda, creá un nuevo ticket.
              </p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
