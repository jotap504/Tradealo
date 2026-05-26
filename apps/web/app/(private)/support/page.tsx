'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TicketCheck, Plus, ChevronRight } from 'lucide-react';
import { support } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { toast } from '@/lib/store';
import type { AdminTicket } from '@/lib/api';

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

const CATEGORIES = [
  { value: 'account', label: 'Mi cuenta' },
  { value: 'billing', label: 'Pagos y tokens' },
  { value: 'listing', label: 'Publicaciones' },
  { value: 'technical', label: 'Problema técnico' },
  { value: 'other', label: 'Otro' },
];

export default function SupportPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('account');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: () => support.listMine(),
    staleTime: 30_000,
  });

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Completá asunto y descripción');
      return;
    }
    setSubmitting(true);
    try {
      await support.createTicket({ subject: subject.trim(), category, message: message.trim() });
      toast.success('Ticket creado. Te responderemos a la brevedad.');
      setShowModal(false);
      setSubject('');
      setMessage('');
      setCategory('account');
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
    } catch {
      toast.error('No se pudo crear el ticket. Intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const items: AdminTicket[] = Array.isArray(tickets) ? tickets : [];

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-tradealo-text">
          Soporte
        </h1>
        <Button leftIcon={<Plus size={16} />} onClick={() => setShowModal(true)}>
          Nuevo ticket
        </Button>
      </div>

      <Card>
        <CardBody>
          {isLoading ? (
            <Skeleton variant="card" className="h-40" />
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <TicketCheck size={40} className="mx-auto text-tradealo-text-muted mb-3" />
              <p className="text-sm text-tradealo-text-muted">
                No tenés tickets de soporte. Si necesitás ayuda, creá uno.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/support/${ticket.id}`}
                  className="flex items-start justify-between gap-3 border border-tradealo-border rounded-xl p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-tradealo-text text-sm truncate">
                      {ticket.subject}
                    </p>
                    <p className="text-xs text-tradealo-text-muted mt-0.5 capitalize">
                      {CATEGORIES.find((c) => c.value === ticket.category)?.label ?? ticket.category}
                      {' · '}
                      <RelativeTime iso={ticket.updatedAt} />
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={STATUS_VARIANT[ticket.status] ?? 'default'} size="sm">
                      {STATUS_LABEL[ticket.status] ?? ticket.status}
                    </Badge>
                    <ChevronRight size={16} className="text-tradealo-text-muted" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Nuevo ticket de soporte"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Asunto"
            placeholder="¿Con qué necesitás ayuda?"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-tradealo-text mb-1.5">
              Categoría
            </label>
            <select
              className="w-full rounded-lg border border-tradealo-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary bg-white"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-tradealo-text mb-1.5">
              Descripción
            </label>
            <textarea
              className="w-full rounded-lg border border-tradealo-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary resize-none"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describí el problema con el mayor detalle posible…"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button fullWidth loading={submitting} onClick={handleCreate}>
              Enviar ticket
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
