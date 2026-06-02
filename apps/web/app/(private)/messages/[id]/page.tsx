'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Loader2, Send } from 'lucide-react';
import { conversations } from '@/lib/api';
import { useAuthStore, toast } from '@/lib/store';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { Message, Conversation } from '@/types';
import { OrderActions } from '@/components/messages/OrderActions';

export default function ConversationPage({
  params,
}: {
  params: { id: string };
}) {
  const conversationId = params.id;
  const currentUser = useAuthStore((s) => s.user);
  const router = useRouter();
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState('');

  const { data: msgData, isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => conversations.getMessages(conversationId, { limit: 100 }),
    refetchInterval: 15_000,
  });

  const { data: convListData } = useQuery({
    queryKey: ['conversations'],
    select: (d: { data: Conversation[] }) => d.data.find((c) => c.id === conversationId),
  });

  const messages = useMemo(() => msgData?.data ?? [], [msgData]);
  const otherParticipant = convListData?.otherParticipant;

  const sendMutation = useMutation({
    mutationFn: (text: string) =>
      conversations.sendMessage(conversationId, { content: text }),
    onSuccess: () => {
      setContent('');
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['messages-unread-count'] });
    },
    onError: () => {
      toast.error('No pudimos enviar el mensaje. Probá de nuevo.');
    },
  });

  // Mark as read on mount
  useEffect(() => {
    conversations.markRead(conversationId).catch(() => {});
    qc.invalidateQueries({ queryKey: ['conversations'] });
    qc.invalidateQueries({ queryKey: ['messages-unread-count'] });
  }, [conversationId, qc]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  return (
    <div className="mx-auto max-w-3xl w-full px-3 sm:px-6 py-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4 min-w-0">
        <button
          onClick={() => router.push('/messages')}
          className="p-2 rounded-lg hover:bg-gray-100 text-tradealo-text-muted shrink-0"
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>
        {otherParticipant ? (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar
              src={otherParticipant.avatarUrl ?? undefined}
              username={
                otherParticipant.username ??
                otherParticipant.email ??
                '?'
              }
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-tradealo-text truncate">
                {otherParticipant.username ??
                  otherParticipant.email ??
                  'Usuario'}
              </p>
              {convListData?.listingTitle && (
                <Link
                  href={`/listing/${convListData.listingId}`}
                  className="text-xs text-tradealo-primary hover:underline inline-flex items-center gap-1 max-w-full truncate"
                >
                  <ExternalLink size={10} className="shrink-0" />
                  <span className="truncate">{convListData.listingTitle}</span>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="h-8 w-48 rounded-md bg-gray-200 animate-pulse" />
        )}
      </div>

      {/* Order actions (for stock purchases) */}
      <OrderActions conversationId={conversationId} />

      {/* Messages */}
      <div className="rounded-xl border border-tradealo-border bg-white h-[60vh] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-tradealo-text-muted">
              <Loader2 className="animate-spin" size={20} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-tradealo-text-muted">
              No hay mensajes todavía. Escribí algo para empezar.
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.senderId === currentUser?.id}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="flex items-end gap-2 border-t border-tradealo-border p-3 sm:p-4"
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribí tu mensaje…"
            rows={2}
            maxLength={2000}
            className="flex-1 min-w-0 resize-none rounded-lg border border-tradealo-border px-3 py-2 text-sm focus:outline-none focus:border-tradealo-primary focus:ring-2 focus:ring-tradealo-primary-light placeholder:text-tradealo-text-muted"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <Button
            type="submit"
            loading={sendMutation.isPending}
            disabled={!content.trim()}
            leftIcon={<Send size={16} />}
            className="shrink-0"
          >
            <span className="hidden sm:inline">Enviar</span>
          </Button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({
  message: m,
  isOwn,
}: {
  message: Message;
  isOwn: boolean;
}) {
  return (
    <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5',
          isOwn
            ? 'bg-tradealo-primary text-white rounded-br-sm'
            : 'bg-gray-100 text-tradealo-text rounded-bl-sm',
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
        <p
          className={cn(
            'text-[10px] mt-1 text-right',
            isOwn ? 'text-white/70' : 'text-tradealo-text-muted',
          )}
        >
          {new Date(m.createdAt).toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })}
        </p>
      </div>
    </div>
  );
}
