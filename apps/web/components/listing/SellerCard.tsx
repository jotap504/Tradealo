import Link from 'next/link';
import { MapPin, Calendar, Store } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { TierBadge } from '@/components/ui/TierBadge';
import { ReputationStars } from '@/components/ui/ReputationStars';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import type { User } from '@/types';

interface Props {
  user?: User | null;
  shopSlug?: string | null;
}

export function SellerCard({ user, shopSlug }: Props) {
  if (!user) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-tradealo-text-muted text-center">
            Información del vendedor no disponible
          </p>
        </CardBody>
      </Card>
    );
  }

  const rep = user.reputation ?? { average: 0, count: 0 };
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-3">
          <Avatar
            src={user.avatarUrl}
            username={user.username ?? user.email}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-heading font-semibold text-base truncate">
                {user.username ?? user.email}
              </p>
              <TierBadge level={user.kycLevel} />
            </div>
            {user.kycLevel > 0 && (
              <Badge variant="primary" size="sm" className="mt-1">
                {user.kycLevel >= 2 ? 'Gold' : 'Silver'}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-4">
          <ReputationStars rating={rep.average} count={rep.count} />
        </div>

        <div className="mt-4 space-y-1.5 text-sm text-tradealo-text-muted">
          {user.province && (
            <div className="flex items-center gap-2">
              <MapPin size={14} />
              <span>
                {user.city ? `${user.city}, ` : ''}
                {user.province}
              </span>
            </div>
          )}
          {user.createdAt && (
            <div className="flex items-center gap-2">
              <Calendar size={14} />
              <span>Miembro desde {formatDate(user.createdAt)}</span>
            </div>
          )}
        </div>

        {user.bio && (
          <p className="mt-3 text-sm text-tradealo-text leading-relaxed">
            {user.bio}
          </p>
        )}

        <div className="mt-4 space-y-2">
          <Link href={user.username ? `/seller/${user.username}` : '#'}>
            <Button variant="secondary" fullWidth>
              Ver perfil
            </Button>
          </Link>
          {shopSlug && (
            <Link href={`/shop/${shopSlug}`}>
              <Button variant="ghost" fullWidth leftIcon={<Store size={15} />}>
                Ver tienda
              </Button>
            </Link>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
