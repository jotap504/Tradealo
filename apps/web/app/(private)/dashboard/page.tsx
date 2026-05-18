'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Wallet,
  ShieldCheck,
  Eye,
  Tag,
  Bell,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { wallet, listings, notifications } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TokenBadge } from '@/components/wallet/TokenBadge';
import { ListingCard } from '@/components/listing/ListingCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { RelativeTime } from '@/components/ui/RelativeTime';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: balance, isLoading: loadingBalance } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => wallet.getBalance(),
    staleTime: 60_000,
  });

  const { data: myListingsData, isLoading: loadingListings } = useQuery({
    queryKey: ['my-listings-dashboard'],
    queryFn: () => listings.getMyListings(),
    staleTime: 60_000,
  });

  const { data: notifData, isLoading: loadingNotifs } = useQuery({
    queryKey: ['notifications-dashboard'],
    queryFn: () => notifications.getNotifications(),
    staleTime: 60_000,
  });

  const myListings = myListingsData?.data?.slice(0, 3) ?? [];
  const recentNotifs = notifData?.data?.slice(0, 3) ?? [];
  const totalViews =
    myListingsData?.data?.reduce((s, l) => s + (l.viewCount ?? 0), 0) ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
      {/* Heading */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-tradealo-text">
          Hola, @{user?.username ?? user?.email}!
        </h1>
        <p className="text-tradealo-text-muted mt-1 text-sm">
          Bienvenido a tu panel de control
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardBody className="flex items-center gap-4">
            {loadingBalance ? (
              <Skeleton variant="text" className="w-full h-10" />
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-tradealo-primary-light flex items-center justify-center text-tradealo-primary shrink-0">
                  <Wallet size={22} />
                </div>
                <div>
                  <p className="text-xs text-tradealo-text-muted mb-1">
                    Tokens disponibles
                  </p>
                  <TokenBadge tokens={balance?.balance ?? 0} size="lg" />
                </div>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center gap-4">
            {loadingListings ? (
              <Skeleton variant="text" className="w-full h-10" />
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <Tag size={22} />
                </div>
                <div>
                  <p className="text-xs text-tradealo-text-muted mb-1">
                    Publicaciones activas
                  </p>
                  <p className="font-heading text-2xl font-bold text-tradealo-text">
                    {myListingsData?.total ?? myListings.length}
                  </p>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center gap-4">
            {loadingListings ? (
              <Skeleton variant="text" className="w-full h-10" />
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                  <Eye size={22} />
                </div>
                <div>
                  <p className="text-xs text-tradealo-text-muted mb-1">
                    Vistas totales
                  </p>
                  <p className="font-heading text-2xl font-bold text-tradealo-text">
                    {totalViews.toLocaleString('es-AR')}
                  </p>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* KYC banner */}
      {user && user.kycLevel < 2 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              Completá tu verificación para publicar sin límites
            </p>
          </div>
          <Link href="/kyc">
            <Button variant="secondary" size="sm">
              Verificar identidad
            </Button>
          </Link>
        </div>
      )}

      {/* Grid: listings + notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-base">
                Mis últimas publicaciones
              </h2>
              <Link
                href="/my-listings"
                className="text-xs text-tradealo-primary hover:underline flex items-center gap-1"
              >
                Ver todas <ArrowRight size={12} />
              </Link>
            </div>
            {loadingListings ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="card" className="h-20" />
                ))}
              </div>
            ) : myListings.length === 0 ? (
              <div className="text-center py-8 text-tradealo-text-muted">
                <Tag size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Todavía no publicaste nada</p>
                <Link href="/my-listings/new" className="mt-3 inline-block">
                  <Button size="sm" leftIcon={<Plus size={14} />}>
                    Nueva publicación
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myListings.map((l) => (
                  <ListingCard key={l.id} listing={l} variant="list" />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-base">
                Notificaciones recientes
              </h2>
              <Link
                href="/notifications"
                className="text-xs text-tradealo-primary hover:underline flex items-center gap-1"
              >
                Ver todas <ArrowRight size={12} />
              </Link>
            </div>
            {loadingNotifs ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="text" className="h-12" />
                ))}
              </div>
            ) : recentNotifs.length === 0 ? (
              <div className="text-center py-8 text-tradealo-text-muted">
                <Bell size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No tenés notificaciones</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentNotifs.map((n) => (
                  <li
                    key={n.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-tradealo-border"
                  >
                    <Bell
                      size={16}
                      className="text-tradealo-primary shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-tradealo-text truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-tradealo-text-muted truncate">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-tradealo-text-muted mt-0.5">
                        <RelativeTime iso={n.createdAt} />
                      </p>
                    </div>
                    {!n.read && (
                      <Badge variant="primary" size="sm">
                        Nueva
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/my-listings/new">
          <Card hover className="cursor-pointer h-full">
            <CardBody className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-tradealo-primary-light flex items-center justify-center text-tradealo-primary shrink-0">
                <Plus size={22} />
              </div>
              <div>
                <p className="font-heading font-semibold text-sm">
                  Nueva publicación
                </p>
                <p className="text-xs text-tradealo-text-muted">
                  Publicá algo nuevo
                </p>
              </div>
            </CardBody>
          </Card>
        </Link>
        <Link href="/messages">
          <Card hover className="cursor-pointer h-full">
            <CardBody className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                <MessageCircle size={22} />
              </div>
              <div>
                <p className="font-heading font-semibold text-sm">
                  Mensajes
                </p>
                <p className="text-xs text-tradealo-text-muted">
                  Conversaciones con compradores
                </p>
              </div>
            </CardBody>
          </Card>
        </Link>
        <Link href="/wallet">
          <Card hover className="cursor-pointer h-full">
            <CardBody className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <Wallet size={22} />
              </div>
              <div>
                <p className="font-heading font-semibold text-sm">
                  Mi billetera
                </p>
                <p className="text-xs text-tradealo-text-muted">
                  Tokens y transacciones
                </p>
              </div>
            </CardBody>
          </Card>
        </Link>
        <Link href="/kyc">
          <Card hover className="cursor-pointer h-full">
            <CardBody className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-tradealo-success shrink-0">
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="font-heading font-semibold text-sm">
                  Verificación KYC
                </p>
                <p className="text-xs text-tradealo-text-muted">
                  Nivel {user?.kycLevel ?? 0} de 2
                </p>
              </div>
            </CardBody>
          </Card>
        </Link>
      </div>
    </div>
  );
}
