'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Swords, Plus, ChevronRight } from 'lucide-react';
import { disputes, type AdminDispute } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { RelativeTime } from '@/components/ui/RelativeTime';

const STATUS_LABEL: Record<string, string> = {
  open: 'Abierta',
  in_review: 'En revisión',
  resolved: 'Resuelta',
  closed: 'Cerrada',
};

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  open: 'warning',
  in_review: 'default',
  resolved: 'success',
  closed: 'default',
};

export default function DisputesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-disputes'],
    queryFn: () => disputes.listMine(),
    staleTime: 30_000,
  });

  const items: AdminDispute[] = Array.isArray(data) ? data : [];

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-tradealo-text">Disputas</h1>
        <Link
          href="/disputes/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-tradealo-primary text-tradealo-primary bg-white hover:bg-tradealo-primary-light text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Nueva disputa
        </Link>
      </div>

      <Card>
        <CardBody>
          {isLoading ? (
            <Skeleton variant="card" className="h-40" />
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Swords size={40} className="mx-auto text-tradealo-text-muted mb-3" />
              <p className="text-sm text-tradealo-text-muted">
                No tenés disputas activas. Si tuviste un problema con una transacción, podés abrir una.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((dispute) => (
                <Link
                  key={dispute.id}
                  href={`/disputes/${dispute.id}`}
                  className="flex items-start justify-between gap-3 border border-tradealo-border rounded-xl p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-tradealo-text text-sm truncate">
                      {dispute.subject}
                    </p>
                    <p className="text-xs text-tradealo-text-muted mt-0.5 line-clamp-1">
                      {dispute.description}
                    </p>
                    <p className="text-xs text-tradealo-text-muted mt-1">
                      <RelativeTime iso={dispute.updatedAt} />
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={STATUS_VARIANT[dispute.status] ?? 'default'} size="sm">
                      {STATUS_LABEL[dispute.status] ?? dispute.status}
                    </Badge>
                    <ChevronRight size={16} className="text-tradealo-text-muted" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
