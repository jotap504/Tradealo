'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, MapPin, Calendar, Star, Pencil } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { kyc, reviews } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { ReputationStars } from '@/components/ui/ReputationStars';
import { Skeleton } from '@/components/ui/Skeleton';
import { KycProgress } from '@/components/kyc/KycProgress';
import { formatDate, formatRelative } from '@/lib/utils';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  const { data: kycStatus, isLoading: loadingKyc } = useQuery({
    queryKey: ['kyc-status'],
    queryFn: async () => {
      try {
        return await kyc.getKycStatus();
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  const { data: reviewsData, isLoading: loadingReviews } = useQuery({
    queryKey: ['user-reviews', user?.id],
    queryFn: () => reviews.getReviews(user!.id),
    staleTime: 60_000,
    enabled: !!user?.id,
  });

  const rep = user?.reputation ?? { average: 0, count: 0 };
  const latestReviews = reviewsData?.data?.slice(0, 5) ?? [];

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      <Card>
        <CardBody className="p-6">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <Avatar
              src={user.avatarUrl}
              username={user.username ?? user.email}
              size="xl"
            />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-heading text-xl font-bold text-tradealo-text">
                  @{user.username ?? user.email}
                </h1>
                {user.kycLevel >= 1 && (
                  <ShieldCheck size={18} className="text-tradealo-primary" />
                )}
              </div>
              {user.kycLevel > 0 && (
                <Badge variant="primary" size="sm">
                  KYC nivel {user.kycLevel}
                </Badge>
              )}
              <ReputationStars rating={rep.average} count={rep.count} />
              <div className="flex flex-col gap-1 text-sm text-tradealo-text-muted">
                {user.province && (
                  <div className="flex items-center gap-1.5">
                    <MapPin size={13} />
                    <span>
                      {user.city ? `${user.city}, ` : ''}
                      {user.province}
                    </span>
                  </div>
                )}
                {user.createdAt && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} />
                    <span>Miembro desde {formatDate(user.createdAt)}</span>
                  </div>
                )}
              </div>
              {user.bio && (
                <p className="text-sm text-tradealo-text leading-relaxed">
                  {user.bio}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-tradealo-border">
            <Link href="/profile/edit">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Pencil size={14} />}
              >
                Editar perfil
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      {loadingKyc ? (
        <Skeleton variant="card" className="h-36" />
      ) : kycStatus ? (
        <KycProgress status={kycStatus} />
      ) : null}

      <div>
        <h2 className="font-heading font-semibold text-base mb-4">
          Últimas opiniones recibidas
        </h2>
        {loadingReviews ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton variant="avatar" />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="text" className="w-1/3" />
                  <Skeleton variant="text" className="w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : latestReviews.length === 0 ? (
          <Card>
            <CardBody className="text-center py-8 text-tradealo-text-muted">
              <Star size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Todavía no tenés opiniones.</p>
            </CardBody>
          </Card>
        ) : (
          <ul className="space-y-4">
            {latestReviews.map((review) => (
              <Card key={review.id}>
                <CardBody className="flex gap-3">
                  <Avatar
                    src={review.reviewer?.avatarUrl}
                    username={review.reviewer?.username ?? 'Usuario'}
                    size="sm"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-tradealo-text">
                        {review.reviewer?.username ?? 'Usuario'}
                      </span>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className={
                              i < review.rating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-gray-300'
                            }
                          />
                        ))}
                      </div>
                      <span className="text-xs text-tradealo-text-muted">
                        {formatRelative(review.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-tradealo-text">{review.comment}</p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
