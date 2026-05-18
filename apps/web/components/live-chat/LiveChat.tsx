'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2, MessageSquare, LogIn } from 'lucide-react';
import { liveChat } from '@/lib/api';
import { useAuthStore, toast } from '@/lib/store';
import { LiveChatMessage as LiveChatMessageComponent } from './LiveChatMessage';
import type { LiveChatMessage as LiveChatMessageType } from '@/types';

interface Props {
  listingId: string;
}

export function LiveChat({ listingId }: Props) {
  const [content, setContent] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['live-chat', listingId],
    queryFn: () => liveChat.getMessages(listingId, { limit: 50 }),
    refetchInterval: 15_000,
  });

  const messages = data?.messages ?? [];
  const sendMutation = useMutation({
    mutationFn: (text: string) => liveChat.sendMessage(listingId, { content: text }),
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['live-chat', listingId] });
      inputRef.current?.focus();
    },
    onError: () => {
      toast.error('No pudimos enviar el mensaje. Probá de nuevo.');
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-tradealo-border">
        <h3 className="text-sm font-semibold text-tradealo-text flex items-center gap-2">
          <MessageSquare size={16} />
          Chat en Vivo
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2 space-y-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-tradealo-text-muted" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare size={28} className="text-tradealo-text-muted mb-2" />
            <p className="text-sm text-tradealo-text-muted">
              No hay mensajes aún. ¡Sé el primero en comentar!
            </p>
          </div>
        ) : (
          <>
            {[...messages].reverse().map((msg: LiveChatMessageType) => (
              <LiveChatMessageComponent key={msg.id} message={msg} />
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {user ? (
        <form onSubmit={handleSubmit} className="shrink-0 border-t border-tradealo-border p-3">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribí un mensaje..."
              rows={1}
              maxLength={500}
              className="flex-1 resize-none rounded-lg border border-tradealo-border bg-gray-50 px-3 py-2 text-sm text-tradealo-text placeholder:text-tradealo-text-muted focus:outline-none focus:ring-2 focus:ring-tradealo-primary/30 focus:border-tradealo-primary"
            />
            <button
              type="submit"
              disabled={!content.trim() || sendMutation.isPending}
              className="shrink-0 rounded-lg bg-tradealo-primary text-white p-2.5 disabled:opacity-50 hover:bg-tradealo-primary-dark transition-colors"
              aria-label="Enviar"
            >
              {sendMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="shrink-0 border-t border-tradealo-border p-4 text-center">
          <a
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-tradealo-primary hover:underline"
          >
            <LogIn size={14} />
            Iniciá sesión para comentar
          </a>
        </div>
      )}
    </div>
  );
}
