'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { conversations } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export function MessageBell() {
  const user = useAuthStore((s) => s.user);

  const { data } = useQuery({
    queryKey: ['messages-unread-count'],
    queryFn: () => conversations.unreadCount(),
    refetchInterval: 90_000,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    enabled: !!user,
  });

  const count = data?.count ?? 0;

  return (
    <Link
      href="/messages"
      className="relative p-2 rounded-lg hover:bg-gray-100 text-tradealo-text transition-colors"
      aria-label="Mensajes"
    >
      <MessageCircle size={20} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-tradealo-primary text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
