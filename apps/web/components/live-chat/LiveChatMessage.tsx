'use client';

import { cn } from '@/lib/utils';
import { formatRelative } from '@/lib/utils';
import type { LiveChatMessage as LiveChatMessageType } from '@/types';

interface Props {
  message: LiveChatMessageType;
}

export function LiveChatMessage({ message }: Props) {
  return (
    <div className={cn('flex gap-2 px-4 py-2', message.isHost && 'bg-tradealo-primary-light/10')}>
      {message.avatarUrl ? (
        <img
          src={message.avatarUrl}
          alt=""
          className="w-7 h-7 rounded-full shrink-0 mt-0.5 object-cover"
        />
      ) : (
        <div className="w-7 h-7 rounded-full shrink-0 mt-0.5 bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
          {message.username?.charAt(0).toUpperCase() ?? '?'}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-tradealo-text truncate">
            {message.username ?? 'Usuario'}
          </span>
          {message.isHost && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-tradealo-primary bg-tradealo-primary-light px-1.5 py-0.5 rounded shrink-0">
              Anfitrión
            </span>
          )}
          <span className="text-[10px] text-tradealo-text-muted shrink-0">
            {formatRelative(message.createdAt)}
          </span>
        </div>
        <p className="text-sm text-tradealo-text break-words">{message.content}</p>
      </div>
    </div>
  );
}
