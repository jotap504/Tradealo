'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  Star,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  MessageCircle,
  ShieldCheck,
  Swords,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { notifications } from '@/lib/api';
import { RelativeTime } from '@/components/ui/RelativeTime';
import type { Notification } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TYPE_ICON: Record<string, React.ComponentType<any>> = {
  message: MessageCircle,
  review: Star,
  listing_approved: CheckCircle2,
  listing_rejected: XCircle,
  listing_expired: Clock,
  payment: DollarSign,
  kyc: ShieldCheck,
  dispute: Swords,
};

function NotifIcon({ type }: { type: string }) {
  const Icon = TYPE_ICON[type] ?? Bell;
  return (
    <div className="w-10 h-10 rounded-full bg-tradealo-primary-light flex items-center justify-center text-tradealo-primary shrink-0">
      <Icon size={18} />
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notifications.getNotifications(),
    staleTime: 60_000,
  });

  useEffect(() => {
    notifications.markAllRead().catch(() => null);
  }, []);

  const items: Notification[] = data?.data ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <h1 className="font-heading text-2xl font-bold text-tradealo-text">
        Notificaciones
      </h1>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton variant="avatar" />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" className="w-1/2" />
                <Skeleton variant="text" className="w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-dashed border-tradealo-border rounded-2xl p-12 text-center">
          <Bell
            size={40}
            className="mx-auto text-tradealo-text-muted mb-4 opacity-40"
          />
          <h3 className="font-heading font-semibold text-lg mb-1">
            No tenés notificaciones
          </h3>
          <p className="text-sm text-tradealo-text-muted">
            Acá aparecerán las novedades sobre tus publicaciones y actividad.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((notif) => {
            const href = (notif as { data?: { href?: string } }).data?.href;
            return (
            <li
              key={notif.id}
              onClick={() => href && router.push(href)}
              className={`flex gap-4 p-4 rounded-xl border transition-all ${
                notif.read
                  ? 'bg-white border-tradealo-border'
                  : 'bg-tradealo-primary-light/30 border-tradealo-primary/20'
              } ${href ? 'cursor-pointer hover:shadow-sm' : ''}`}
            >
              <NotifIcon type={notif.type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-tradealo-text">
                    {notif.title}
                  </p>
                  {!notif.read && (
                    <Badge variant="primary" size="sm">
                      Nueva
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-tradealo-text-muted mt-0.5">
                  {notif.message}
                </p>
                <p className="text-xs text-tradealo-text-muted mt-1">
                  <RelativeTime iso={notif.createdAt} />
                </p>
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
