'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageCircle, Loader2, ChevronRight } from 'lucide-react';
import { conversations } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { RelativeTime } from '@/components/ui/RelativeTime';
import type { Conversation } from '@/types';

export default function MessagesPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => conversations.getConversations({ limit: 50 }),
    refetchInterval: 30_000,
  });

  const list = data?.data ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2 rounded-lg hover:bg-gray-100 text-tradealo-text-muted"
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-heading text-2xl font-bold text-tradealo-text">
          Mensajes
        </h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-tradealo-text-muted">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardBody className="text-center py-16">
            <MessageCircle
              size={48}
              className="mx-auto text-tradealo-text-muted/40 mb-4"
            />
            <p className="text-lg font-medium text-tradealo-text mb-1">
              No tenés conversaciones
            </p>
            <p className="text-sm text-tradealo-text-muted">
              Cuando contactes a un vendedor o te escriban, aparecerán acá.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((conv) => (
            <ConversationRow key={conv.id} conversation={conv} />
          ))}
        </div>
      )}
    </div>
  );
}

function ConversationRow({ conversation: c }: { conversation: Conversation }) {
  const qc = useQueryClient();

  return (
    <Link
      href={`/messages/${c.id}`}
      onClick={() => {
        if (c.unreadCount > 0) {
          conversations.markRead(c.id).catch(() => {});
          qc.invalidateQueries({ queryKey: ['conversations'] });
          qc.invalidateQueries({ queryKey: ['messages-unread-count'] });
        }
      }}
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl border border-tradealo-border bg-white hover:bg-gray-50 transition-colors',
        c.unreadCount > 0 && 'border-tradealo-primary/30 bg-teal-50/40',
      )}
    >
      <Avatar
        src={c.otherParticipant.avatarUrl ?? undefined}
        username={c.otherParticipant.username ?? c.otherParticipant.email ?? '?'}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              'text-sm truncate',
              c.unreadCount > 0 ? 'font-semibold text-tradealo-text' : 'font-medium text-tradealo-text',
            )}
          >
            {c.otherParticipant.username ?? c.otherParticipant.email ?? 'Usuario'}
          </p>
          {c.lastMessageAt && (
            <RelativeTime iso={c.lastMessageAt} className="text-[11px] text-tradealo-text-muted shrink-0" />
          )}
        </div>
        {c.listingTitle && (
          <p className="text-xs text-tradealo-text-muted truncate">
            Re: {c.listingTitle}
          </p>
        )}
        <p
          className={cn(
            'text-xs truncate mt-0.5',
            c.unreadCount > 0 ? 'font-medium text-tradealo-text' : 'text-tradealo-text-muted',
          )}
        >
          {c.lastMessageText ?? 'Sin mensajes todavía'}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {c.unreadCount > 0 && (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-tradealo-primary text-white text-[10px] font-bold flex items-center justify-center">
            {c.unreadCount > 9 ? '9+' : c.unreadCount}
          </span>
        )}
        <ChevronRight size={16} className="text-tradealo-text-muted" />
      </div>
    </Link>
  );
}
