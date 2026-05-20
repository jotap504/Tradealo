'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TicketCheck } from 'lucide-react';
import Link from 'next/link';
import { admin, type AdminTicket } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { RelativeTime } from '@/components/ui/RelativeTime';

type StatusFilter = '' | 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
type PriorityFilter = '' | 'low' | 'medium' | 'high' | 'urgent';
type CategoryFilter = '' | 'account' | 'billing' | 'listing' | 'technical' | 'other';

const priorityVariant = (p: AdminTicket['priority']): 'default' | 'warning' | 'danger' => {
  if (p === 'low') return 'default';
  if (p === 'medium') return 'warning';
  return 'danger';
};

const priorityLabel: Record<AdminTicket['priority'], string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

const statusVariant = (s: AdminTicket['status']): 'warning' | 'default' | 'success' | 'danger' => {
  if (s === 'open') return 'warning';
  if (s === 'in_progress' || s === 'waiting_user') return 'default';
  if (s === 'resolved') return 'success';
  return 'danger';
};

const statusLabel: Record<AdminTicket['status'], string> = {
  open: 'Abierto',
  in_progress: 'En progreso',
  waiting_user: 'Esperando usuario',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};

const categoryLabel: Record<string, string> = {
  account: 'Cuenta',
  billing: 'Facturación',
  listing: 'Publicación',
  technical: 'Técnico',
  other: 'Otro',
};

export default function AdminTicketsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const params = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(priorityFilter ? { priority: priorityFilter } : {}),
    ...(categoryFilter ? { category: categoryFilter } : {}),
    ...(cursor ? { cursor } : {}),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tickets', statusFilter, priorityFilter, categoryFilter, cursor],
    queryFn: () => admin.getTickets(params),
    staleTime: 30_000,
  });

  const resetFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setCursor(undefined);
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-tradealo-text">Tickets de Soporte</h1>

      {/* Filters */}
      <Card>
        <CardBody className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-tradealo-text-muted whitespace-nowrap">Estado:</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setCursor(undefined); }}
              className="rounded-lg border border-tradealo-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary"
            >
              <option value="">Todos</option>
              <option value="open">Abierto</option>
              <option value="in_progress">En progreso</option>
              <option value="waiting_user">Esperando usuario</option>
              <option value="resolved">Resuelto</option>
              <option value="closed">Cerrado</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-tradealo-text-muted whitespace-nowrap">Prioridad:</label>
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value as PriorityFilter); setCursor(undefined); }}
              className="rounded-lg border border-tradealo-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary"
            >
              <option value="">Todas</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-tradealo-text-muted whitespace-nowrap">Categoría:</label>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value as CategoryFilter); setCursor(undefined); }}
              className="rounded-lg border border-tradealo-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary"
            >
              <option value="">Todas</option>
              <option value="account">Cuenta</option>
              <option value="billing">Facturación</option>
              <option value="listing">Publicación</option>
              <option value="technical">Técnico</option>
              <option value="other">Otro</option>
            </select>
          </div>

          {(statusFilter || priorityFilter || categoryFilter) && (
            <Button size="sm" variant="ghost" onClick={resetFilters}>Limpiar</Button>
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
              <TicketCheck size={40} className="mx-auto text-tradealo-text-muted mb-3" />
              <p className="text-sm text-tradealo-text-muted">No hay tickets de soporte</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[760px]">
                  <thead>
                    <tr className="border-b border-tradealo-border text-left text-tradealo-text-muted text-xs">
                      <th className="pb-2 font-medium">Fecha</th>
                      <th className="pb-2 font-medium">Asunto</th>
                      <th className="pb-2 font-medium">Usuario</th>
                      <th className="pb-2 font-medium">Categoría</th>
                      <th className="pb-2 font-medium">Prioridad</th>
                      <th className="pb-2 font-medium">Estado</th>
                      <th className="pb-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((t: AdminTicket) => (
                      <tr key={t.id} className="border-b border-tradealo-border last:border-0">
                        <td className="py-3 pr-4 text-tradealo-text-muted whitespace-nowrap">
                          <RelativeTime iso={t.createdAt} />
                        </td>
                        <td className="py-3 pr-4 text-tradealo-text max-w-[180px] truncate">
                          {t.subject}
                        </td>
                        <td className="py-3 pr-4 text-tradealo-text-muted text-xs font-mono">
                          {t.userEmail ?? t.userId.slice(0, 8) + '…'}
                        </td>
                        <td className="py-3 pr-4 text-tradealo-text-muted">
                          {categoryLabel[t.category] ?? t.category}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge size="sm" variant={priorityVariant(t.priority)}>
                            {priorityLabel[t.priority]}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge size="sm" variant={statusVariant(t.status)}>
                            {statusLabel[t.status]}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Link
                            href={`/admin/tickets/${t.id}`}
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
