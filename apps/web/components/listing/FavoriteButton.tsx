'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { favorites } from '@/lib/api';
import { useAuthStore, toast } from '@/lib/store';
import { cn } from '@/lib/utils';

interface Props {
  listingId: string;
  size?: number;
  className?: string;
  variant?: 'icon' | 'pill';
}

export function FavoriteButton({ listingId, size = 18, className, variant = 'icon' }: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ['favorites', 'ids'],
    queryFn: () => favorites.listIds(),
    enabled: !!user,
    staleTime: 60_000,
  });

  const isFav = favoriteIds.includes(listingId);

  const toggle = useMutation({
    mutationFn: () =>
      isFav ? favorites.remove(listingId) : favorites.add(listingId),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['favorites', 'ids'] });
      const prev = qc.getQueryData<string[]>(['favorites', 'ids']) ?? [];
      const next = isFav
        ? prev.filter((id) => id !== listingId)
        : [...prev, listingId];
      qc.setQueryData(['favorites', 'ids'], next);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['favorites', 'ids'], ctx.prev);
      toast.error('No se pudo actualizar favoritos');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push('/login');
      return;
    }
    toggle.mutate();
  };

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={toggle.isPending}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 h-9 rounded-full border text-sm font-medium transition-colors',
          isFav
            ? 'bg-tradealo-error/10 border-tradealo-error/30 text-tradealo-error'
            : 'bg-white border-tradealo-border text-tradealo-text hover:bg-gray-50',
          className,
        )}
        aria-pressed={isFav}
        aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      >
        <Heart size={size} className={isFav ? 'fill-current' : ''} />
        {isFav ? 'En favoritos' : 'Agregar a favoritos'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={toggle.isPending}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-white/95 backdrop-blur-sm shadow-sm hover:bg-white transition-colors',
        className,
      )}
      style={{ width: size + 14, height: size + 14 }}
      aria-pressed={isFav}
      aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
    >
      <Heart
        size={size}
        className={cn(
          'transition-colors',
          isFav ? 'fill-tradealo-error text-tradealo-error' : 'text-tradealo-text-muted',
        )}
      />
    </button>
  );
}
