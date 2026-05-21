'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Send,
  Paperclip,
  Loader2,
  Swords,
  XCircle,
} from 'lucide-react';
import { disputes } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { RelativeTime } from '@/components/ui/RelativeTime';
import type { AdminDispute } from '@/lib/api';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: 'Abierto', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  in_review: { label: 'En revisión', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  resolved: { label: 'Resuelto', color: 'text-green-600 bg-green-50 border-green-200' },
  closed: { label: 'Cerrado', color: 'text-gray-500 bg-gray-50 border-gray-200' },
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function DisputeDetailModal({
  dispute,
  onClose,
  onClosed,
}: {
  dispute: AdminDispute;
  onClose: () => void;
  onClosed?: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState('');
  const [pendingImage, setPendingImage] = useState<{ url: string; uploading?: boolean } | null>(null);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['dispute', dispute.id],
    queryFn: () => disputes.get(dispute.id),
    refetchInterval: 15_000,
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      disputes.addMessage(dispute.id, message.trim(), pendingImage?.url),
    onSuccess: () => {
      setMessage('');
      setPendingImage(null);
      qc.invalidateQueries({ queryKey: ['dispute', dispute.id] });
    },
    onError: () => toast.error('No se pudo enviar el mensaje.'),
  });

  const closeMutation = useMutation({
    mutationFn: () => disputes.close(dispute.id),
    onSuccess: () => {
      toast.success('Reclamo cerrado.');
      qc.invalidateQueries({ queryKey: ['disputes-mine'] });
      onClosed?.();
      onClose();
    },
    onError: () => toast.error('No se pudo cerrar el reclamo.'),
  });

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar 5 MB.');
      return;
    }
    setPendingImage({ url: '', uploading: true });
    try {
      const data = await fileToBase64(file);
      const res = await disputes.uploadImage(dispute.id, data, file.type);
      setPendingImage({ url: res.imageUrl });
    } catch {
      toast.error('No se pudo subir la imagen.');
      setPendingImage(null);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const status = detail?.status ?? dispute.status;
  const isClosed = status === 'closed' || status === 'resolved';
  const statusInfo = STATUS_LABELS[status] ?? STATUS_LABELS.open;
  const messages = detail?.messages ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-tradealo-border shrink-0">
          <div className="flex items-start gap-2 min-w-0">
            <Swords size={18} className="text-tradealo-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h2 className="font-heading font-bold text-base text-tradealo-text truncate">
                {dispute.subject}
              </h2>
              <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-tradealo-text-muted hover:text-tradealo-text shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Description */}
        <div className="px-5 py-3 bg-gray-50 border-b border-tradealo-border shrink-0">
          <p className="text-xs text-tradealo-text-muted leading-relaxed">{dispute.description}</p>
        </div>

        {/* Message thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-tradealo-text-muted" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-tradealo-text-muted py-6">
              Aún no hay mensajes en este reclamo.
            </p>
          ) : (
            messages.map((msg) => {
              const isMe = msg.authorId === user?.id;
              const isAdmin = msg.authorType === 'admin';
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      isAdmin
                        ? 'bg-blue-50 border border-blue-200 text-blue-800'
                        : isMe
                          ? 'bg-tradealo-primary text-white'
                          : 'bg-gray-100 text-tradealo-text'
                    }`}
                  >
                    {isAdmin && (
                      <p className="text-[10px] font-semibold text-blue-500 mb-1">Equipo Trocalia</p>
                    )}
                    {msg.message && <p className="leading-snug">{msg.message}</p>}
                    {msg.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={msg.imageUrl}
                        alt="adjunto"
                        className="mt-2 rounded-lg max-w-full max-h-48 object-contain"
                      />
                    )}
                    <p className={`text-[10px] mt-1 ${isMe ? 'text-white/70' : 'text-tradealo-text-muted'}`}>
                      <RelativeTime iso={msg.createdAt} />
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Compose area */}
        {!isClosed && (
          <div className="p-4 border-t border-tradealo-border shrink-0 space-y-2">
            {pendingImage && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-tradealo-border">
                {pendingImage.uploading ? (
                  <Loader2 size={14} className="animate-spin text-tradealo-text-muted shrink-0" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pendingImage.url} alt="preview" className="w-10 h-10 object-cover rounded" />
                )}
                <span className="text-xs text-tradealo-text-muted flex-1 truncate">
                  {pendingImage.uploading ? 'Subiendo imagen…' : 'Imagen adjunta'}
                </span>
                {!pendingImage.uploading && (
                  <button onClick={() => setPendingImage(null)} className="text-tradealo-text-muted hover:text-red-500">
                    <XCircle size={14} />
                  </button>
                )}
              </div>
            )}
            <div className="flex gap-2 items-end">
              <textarea
                rows={2}
                placeholder="Escribí tu mensaje..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (message.trim() || pendingImage?.url) sendMutation.mutate();
                  }
                }}
                maxLength={2000}
                className="flex-1 rounded-xl border border-tradealo-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary/30 focus:border-tradealo-primary resize-none"
              />
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={!!pendingImage}
                  title="Adjuntar imagen"
                  className="p-2 rounded-lg border border-tradealo-border text-tradealo-text-muted hover:text-tradealo-primary hover:border-tradealo-primary transition-colors disabled:opacity-40"
                >
                  <Paperclip size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => sendMutation.mutate()}
                  disabled={sendMutation.isPending || (!message.trim() && !pendingImage?.url) || !!pendingImage?.uploading}
                  className="p-2 rounded-lg bg-tradealo-primary text-white hover:bg-tradealo-primary-hover transition-colors disabled:opacity-40"
                >
                  {sendMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
          </div>
        )}

        {/* Footer */}
        <div className="px-5 pb-4 flex gap-2 shrink-0">
          {!isClosed && (
            <Button
              variant="danger"
              size="sm"
              fullWidth
              loading={closeMutation.isPending}
              onClick={() => closeMutation.mutate()}
            >
              Cerrar reclamo
            </Button>
          )}
          <Button variant="secondary" size="sm" fullWidth onClick={onClose}>
            {isClosed ? 'Cerrar' : 'Cancelar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
