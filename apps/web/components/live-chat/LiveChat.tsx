'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2, MessageSquare, LogIn, Smile } from 'lucide-react';
import { AxiosError } from 'axios';
import { liveChat } from '@/lib/api';
import { useAuthStore, toast } from '@/lib/store';
import { LiveChatMessage as LiveChatMessageComponent } from './LiveChatMessage';
import type { LiveChatMessage as LiveChatMessageType } from '@/types';

const EMOJIS = [
  '😀', '😂', '🤣', '😊', '😍', '🥰', '😎', '🤩',
  '👍', '🔥', '💯', '🎉', '❤️', '💪', '🙌', '👏',
  '✨', '🌟', '💡', '🎯', '🚀', '💰', '🙏', '🤝',
];

interface Props {
  listingId: string;
}

export function LiveChat({ listingId }: Props) {
  const [content, setContent] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
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
    onError: (err: Error) => {
      if (err instanceof AxiosError && err.response?.status === 429) {
        toast.error('Enviaste muchos mensajes. Esperá un momento antes de enviar otro.');
      } else {
        toast.error('No pudimos enviar el mensaje. Probá de nuevo.');
      }
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data]);

  useEffect(() => {
    if (!showEmojis) return;
    const onClick = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojis(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showEmojis]);

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const next = content.slice(0, start) + emoji + content.slice(end);
    setContent(next);
    setShowEmojis(false);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || sendMutation.isPending) return;
    setShowEmojis(false);
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
          <div className="flex gap-2 items-end relative">
            <div className="flex-1 flex items-end gap-1.5">
              {/* Emoji button */}
              <div ref={emojiRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojis(!showEmojis)}
                  className="shrink-0 rounded-lg p-2 text-tradealo-text-muted hover:text-tradealo-text hover:bg-gray-100 transition-colors"
                  aria-label="Emojis"
                >
                  <Smile size={18} />
                </button>

                {showEmojis && (
                  <div className="absolute bottom-full left-0 mb-1 bg-white rounded-xl shadow-lg border border-tradealo-border p-2 grid grid-cols-6 gap-1 z-30">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

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
            </div>

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
